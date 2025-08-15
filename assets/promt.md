BoilerBrain Windsurf Prompt
🧠 Project Objective
Create a production-ready diagnostic chat dock for BoilerBrain — a smart assistant that acts like a senior UK gas engineer. The goal is to support qualified engineers with accurate fault finding, either through structured database results or expert-level fallback reasoning using GPT-4 Turbo.

✅ Core Workflow
Collect Required Info Once:

system_type (combi, system, standard)

make_model

gc_number (optional)

fault_code or symptom

Once All Data is Captured:

Query Supabase database:

boiler_fault_codes

diagnostics

manuals

If fault code found → summarize and return solution

If not found → trigger GPT-4 Turbo to reason and diagnose like a senior engineer

📂 Supabase Tables
boiler_fault_codes
Fields: manufacturer, model, gc_number, fault_code, description, solutions

manuals
Fields: model_name, gc_number, pdf_url, raw_text

diagnostics
Fields: subsystem, procedure, test_type, steps

gas_safety_regulations
Fields: reg_number, title, summary, body, trigger_context, regulation_ref

💬 LLM System Prompt (Injected to GPT-4 Turbo)
diff
Copy
Edit
You are BoilerBrain, a senior gas engineer helping another qualified engineer.

Ask only for missing:
- Boiler system type
- Make/model
- GC number
- Fault code or symptom

When all details are available:
- Try to find fault in the database and explain fix
- If fault not found, use expert engineering knowledge to give a probable diagnosis
- Respond professionally — short, direct, no fluff
- If user asks how to test or seems unsure, provide step-by-step instructions
- If flue, seals, combustion, or gas terms are mentioned, reference gas safety regulations
🧠 Instruction Depth (Skill-Based Toggle)
Default: concise, direct fix

If user types things like:

"How do I check that?"

"Can you walk me through it?"

"What tools do I need?"
→ Set detail_mode = true

If detail_mode = true:

Return test steps, values, tool guidance, part locations, and safety tips

Manual user override:

@detailed → forces detail_mode = true

@basic → forces detail_mode = false

⚠️ Regulation Trigger
If any of these terms are mentioned in the fault/symptom:

"flue", "combustion", "burner pressure", "gas valve", "seal"

→ Query gas_safety_regulations
→ Return the relevant reg summary and ref only if contextually needed

📡 GPT-4 Turbo Output Format
GPT must return a JSON object like:

json
Copy
Edit
{
  "action": "ask" | "query" | "fallback_reasoning",
  "response": "Message for the user",
  "context_update": { "key": "value" },
  "sql_query": "SELECT ...", // optional
  "manual_link": "..." // optional
}
🧪 Test Scenarios
✅ Combi + Ideal + GC + F1 → return DB result for low pressure

✅ System + Worcester + EA → fallback to GPT-4 Turbo

✅ “How do I test the fan?” → full multimeter guide

✅ “Fan failed + smell of gas” → return fix + regulation trigger

✅ “@detailed” → switch to full step-by-step mode

🎯 Goal
The chat dock must:

Support structured + fallback logic

Be memory-aware (no repeated questions)

Adjust to engineer experience

Return a clear fix every time — database or LLM reasoning

