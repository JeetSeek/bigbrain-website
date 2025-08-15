import os
import json
import ast
from psycopg2 import OperationalError
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from langchain_community.utilities import SQLDatabase
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

# Load environment variables from .env file
load_dotenv()

# Initialize Flask App
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Database Connection ---
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME")

if not all([db_user, db_password, db_host, db_port, db_name]):
    raise ValueError("One or more database environment variables are not set.")

# Construct the database URI and create the SQLAlchemy engine
db_uri = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
engine = create_engine(db_uri)

# Include all relevant tables for the SQL Database object
included_tables = [
    'boiler_manuals', 'boiler_fault_codes', 'boiler_components',
    'diagnostic_symptoms', 'diagnostic_procedures', 'symptom_fault_relationships',
    'chat_sessions', 'knowledge_base', 'boiler_models', 'repair_histories'
]
db = SQLDatabase(engine=engine, include_tables=included_tables)


# --- LLM and Query Chain Initialization ---
llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
DIAGNOSTIC_WORKFLOW_TEMPLATE = """You are BoilerBrain, a senior gas engineer helping another qualified engineer.

**Conversation History:**
{chat_history}

**Current Diagnostic Context:**
{context}

--- YOUR TASK ---

**1. Analyze User Input & Context:**
   - Extract any missing diagnostic information: system_type (combi/system/standard), make_model, gc_number (optional), fault_code or symptom.
   - Check for detail mode triggers: phrases like "How do I check that?", "Can you walk me through it?", "What tools do I need?" should set detail_mode = true.
   - Check for manual overrides: "@detailed" forces detail_mode = true, "@basic" forces detail_mode = false.
   - Check for regulation triggers: if "flue", "combustion", "burner pressure", "gas valve", "seal" are mentioned, set regulation_trigger = true.

**2. Follow the Structured Diagnostic Workflow:**
   - **Ask only for missing information** in this order: system_type → make_model → fault_code/symptom
   - **When all details are available:**
     * Try to find fault in the database first
     * If fault not found, use expert engineering knowledge for probable diagnosis
     * Respond professionally — short, direct, no fluff
     * If detail_mode = true, provide step-by-step instructions with test values, tools, part locations, safety tips

**3. Database Query Priority:**
   1. boiler_fault_codes (manufacturer, model_name, gc_number, fault_code, description, solutions)
   2. diagnostics (subsystem, procedure, test_type, steps)
   3. manuals (model_name, gc_number, pdf_url, raw_text)
   4. gas_safety_regulations (if regulation_trigger = true)

**4. Construct JSON Output:**
   - **`action`**: "ask" | "query" | "fallback_reasoning"
   - **`response`**: Message for the user
   - **`context_update`**: New information learned (e.g., {{"system_type": "combi", "detail_mode": true}})
   - **`sql_query`**: PostgreSQL query string (if action is "query")
   - **`manual_link`**: PDF URL from manuals table (if available)
   - **`regulation_ref`**: Gas safety regulation reference (if regulation_trigger = true)

--- EXAMPLE JSON OUTPUTS ---

*   **Asking for System Type:**
    ```json
    {{
      "action": "ask",
      "response": "What type of heating system are you working on? (combi, system, standard)",
      "context_update": {{}},
      "sql_query": "",
      "manual_link": "",
      "regulation_ref": ""
    }}
    ```

*   **Database Query with Detail Mode:**
    ```json
    {{
      "action": "query",
      "response": "",
      "context_update": {{"detail_mode": true}},
      "sql_query": "SELECT bf.solutions, m.pdf_url FROM boiler_fault_codes bf LEFT JOIN manuals m ON bf.model = m.model_name WHERE bf.manufacturer = 'Ideal' AND bf.fault_code = 'F1'",
      "manual_link": "",
      "regulation_ref": ""
    }}
    ```

*   **Fallback Reasoning:**
    ```json
    {{
      "action": "fallback_reasoning",
      "response": "Based on the symptoms, this sounds like a circulation pump issue. Check pump operation and system pressure first.",
      "context_update": {{}},
      "sql_query": "",
      "manual_link": "",
      "regulation_ref": ""
    }}
    ```

**Available Tables:**
{table_info}

**Latest User Input:** {question}

Your JSON Response:
"""
prompt = ChatPromptTemplate.from_template(DIAGNOSTIC_WORKFLOW_TEMPLATE)

query_chain = (
    RunnablePassthrough.assign(table_info=lambda x: db.get_table_info())
    | prompt
    | llm
    | StrOutputParser()
)


# --- API Endpoints ---
@app.route('/')
def index():
    return 'Python server is running!'

@app.route('/api/tables', methods=['GET'])
def get_tables():
    try:
        table_names = db.get_table_names()
        return jsonify({'tables': table_names})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/text-to-sql', methods=['POST'])
def text_to_sql():
    data = request.get_json()
    question = data.get('question')
    session_id = data.get('sessionId')

    if not session_id:
        return jsonify({'error': 'No session ID provided'}), 400

    if not question:
        return jsonify({'error': 'No question provided'}), 400

    try:
        with engine.connect() as connection:
            # Use a transaction
            with connection.begin():
                # 1. Fetch or create session using parameterized queries
                result = connection.execute(
                    text("SELECT history FROM chat_sessions WHERE session_id = :session_id"),
                    {'session_id': session_id}
                ).fetchone()

                if result:
                    history = result[0] if result[0] else []
                else:
                    history = []
                    connection.execute(
                        text("INSERT INTO chat_sessions (session_id, history) VALUES (:session_id, :history)"),
                        {'session_id': session_id, 'history': json.dumps(history)}
                    )

                history.append({"role": "user", "content": question})

                # 2. Invoke LLM chain
                llm_response_str = query_chain.invoke({
                    "question": question,
                    "chat_history": json.dumps(history, indent=2),
                    "context": json.dumps({}, indent=2)  # Empty context for now
                })

                # 3. Parse LLM's JSON response (handle markdown code blocks)
                try:
                    # Strip markdown code blocks if present
                    json_str = llm_response_str.strip()
                    if json_str.startswith('```json'):
                        json_str = json_str[7:]  # Remove ```json
                    if json_str.startswith('```'):
                        json_str = json_str[3:]   # Remove ```
                    if json_str.endswith('```'):
                        json_str = json_str[:-3]  # Remove closing ```
                    json_str = json_str.strip()
                    
                    llm_json = json.loads(json_str)
                    action = llm_json.get("action")
                    response_text = llm_json.get("response")
                    context_update = llm_json.get("context_update", {})
                    sql_query = llm_json.get("sql_query")
                    # Temporary SQL alias fix for schema mismatch
                    if sql_query:
                        sql_query = sql_query.replace(" bf.model ", " bf.model_name ")
                        sql_query = sql_query.replace(" bf.model,", " bf.model_name,")
                        sql_query = sql_query.replace(".model =", ".model_name =")
                    manual_link = llm_json.get("manual_link", "")
                    regulation_ref = llm_json.get("regulation_ref", "")
                except json.JSONDecodeError:
                    return jsonify({'error': 'Failed to decode LLM response JSON.', 'llm_response': llm_response_str}), 500

                # 4. Update context (placeholder for future context management)
                # context handling will be implemented when schema is fixed

                # 5. Execute action
                final_response = ""
                sql_query_for_response = "N/A"

                if action == "query":
                    # Execute the SQL query with parameters
                    if sql_query:
                        query_result = connection.execute(text(sql_query)).fetchall()
                        if query_result:
                            # Convert first row into dict for friendly formatting
                            row_dict = dict(query_result[0]._mapping)
                            description = row_dict.get("description", "")
                            solutions_val = row_dict.get("solutions")

                            # Parse solutions which may come back as text[] (list) or string representation
                            solutions_list = []
                            if isinstance(solutions_val, list):
                                solutions_list = solutions_val
                            elif isinstance(solutions_val, str):
                                try:
                                    # Attempt to interpret string as list literal
                                    solutions_list = ast.literal_eval(solutions_val)
                                    if not isinstance(solutions_list, list):
                                        solutions_list = [solutions_val]
                                except (ValueError, SyntaxError):
                                    solutions_list = [solutions_val]

                            # Build formatted response
                            final_response = description.strip()
                            if solutions_list:
                                steps = "\n".join([f"- {s}" for s in solutions_list])
                                final_response += f"\n\nRecommended steps:\n{steps}"

                            # Add manual link if available
                            if manual_link:
                                final_response += f"\n\n📖 Manual: {manual_link}"
                            # Add regulation reference if triggered
                            if regulation_ref:
                                final_response += f"\n\n⚠️ Gas Safety Regulation: {regulation_ref}"
                        else:
                            # No database results - switch to fallback reasoning
                            final_response = response_text or "No specific fault code found. Based on the information provided, I'll use my engineering experience to help diagnose the issue."
                    else:
                        final_response = "Unable to generate a database query."
                    sql_query_for_response = sql_query
                    
                elif action == "fallback_reasoning":
                    final_response = response_text
                    if manual_link:
                        final_response += f"\n\n📖 Manual: {manual_link}"
                    if regulation_ref:
                        final_response += f"\n\n⚠️ Gas Safety Regulation: {regulation_ref}"
                        
                elif action == "ask":
                    final_response = response_text
                    
                else: # Unknown action
                    final_response = response_text or "I'm not sure how to proceed. Could you please clarify?"

                # 6. Update history in DB
                history.append({"role": "assistant", "content": final_response})
                connection.execute(
                    text("UPDATE chat_sessions SET history = :history WHERE session_id = :session_id"),
                    {'history': json.dumps(history), 'session_id': session_id}
                )

            return jsonify({
                'response': final_response,
                'sql_query': sql_query_for_response,
                'session_id': session_id,
                'manual_link': manual_link,
                'regulation_ref': regulation_ref,
                'action': action
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# We will add the /api/chat endpoint here later





# We will add the /api/chat endpoint here later

if __name__ == '__main__':
    # The backend server will run on port 3205 to avoid conflict with the Node server (3204)
    # and the Vite frontend (5176)
    port = int(os.environ.get('PORT', 3205))
    app.run(debug=True, port=port)
