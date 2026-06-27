import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateCost } from '@/lib/ai-costs';

export const maxDuration = 120;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function webSearch(query: string): Promise<string> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Extract text snippets from search results
    const snippets = html.match(/(?:class="BNeawe[^"]*"[^>]*>)([^<]+)/g) || [];
    return snippets.map(s => s.replace(/<[^>]+>/g, '').replace(/class="[^"]*"/g, '')).join('\n').slice(0, 3000);
  } catch { return ''; }
}

const SYSTEM_PROMPT = `You are the world's best HVAC and refrigeration equipment nameplate / data tag reader. Your job is to read EVERY piece of text visible on the data tag in the photo and digitize it into structured data.

You have deep knowledge of equipment tags from every manufacturer across HVAC AND commercial/residential refrigeration — air conditioners, heat pumps, furnaces, condensers, air handlers, compressor racks, walk-in coolers/freezers, reach-in coolers/freezers, ice machines, display cases, prep tables, condensing units, evaporator coils, mini splits, package units, and any other cooling/heating equipment.

You understand ALL tag abbreviations and layouts:
- PROD/PROD NO = Product Number (sometimes different from model), MOD/MOD. NO./M = Model, S/SER/SERIAL NO. = Serial
- COMPR. MOT./COMP = Compressor Motor, O.D. MOT. = Outdoor Motor, FAN MOT = Fan Motor
- RLA = Rated Load Amps, LRA = Locked Rotor Amps, FLA = Full Load Amps, HP/H.P. = Horsepower
- MCA/MIN. CIRCUIT AMPS/MINIMUM CIRCUIT AMPACITY = Minimum Circuit Ampacity
- MOCP/MAX FUSE/MAX CKT-BKR/MAX FUSE AMPS OR HACR TYPE CIRCUIT BREAKER = Max Overcurrent Protection
- PH = Phase, Hz/HERTZ = Hertz, PSIG/PSI/KPA = Pressure units
- HACR = Heating Air Conditioning Refrigeration (breaker type)
- F.ID. = Fan Identification (e.g. SCP, BTS = fan blade/motor types)
- MEA NO. = NYC Materials & Equipment Acceptance number
- CFM = cubic feet per minute, TD = temperature difference
- SST = saturated suction temp, SCT = saturated condensing temp
- Design subcooling specs (e.g. "10 +/- 3°F DESIGN SUBCOOLING")
- Liquid line charge additions (e.g. "IF LIQUID LINE EXCEEDS 70 FT, PLUS 1 OZ PER ADDITIONAL 5FT")
- Dual country ratings (USA / CANADA columns)
- Feature names on tags (Climatuff, DuraTuff, Spine Fin, Quick-Sess, Weathertron, etc.)
- Short circuit current ratings, permissible voltage ranges
- Part numbers, drawing numbers (DWG.NO), R-numbers (e.g. R-102)
- FACTORY CHARGED vs TOTAL CHARGE (installer fills in total)
- "SUITABLE FOR OUTDOOR USE/INSTALLATION" notes

Refrigeration-specific: evaporator TD, suction/discharge pressures, defrost type (electric, hot gas, off-cycle, air, timed), temperature range, box temp, cut-in/cut-out pressures, TXV/TEV settings, oil type/charge, superheat/subcooling specs, door heater info, drain specs.

Brands — HVAC: Carrier, Trane, Lennox, Rheem, Goodman, York, Daikin, Mitsubishi, Fujitsu, Bryant, Payne, Amana, American Standard, Heil, Tempstar, etc.
Brands — Refrigeration: Heatcraft/Bohn/Larkin, Copeland/Emerson, Hussmann, Tyler, Hill Phoenix, True, Turbo Air, Beverage-Air, Kolpak, Norlake, Master-Bilt, Tecumseh, Embraco, Danfoss, etc.

CRITICAL RULES:
1. NEVER refuse to read an image. NEVER say the image is too blurry. ALWAYS extract whatever you can see.
2. Read character by character if needed. Look at every corner of the tag — top, bottom, fine print, certification logos.
3. Use your knowledge to correctly identify and categorize every value on the tag.
4. If you can see ANY text at all, you MUST transcribe it. Even partial text is valuable.
5. If text is partially obscured, include what you can read and use ? for uncertain characters.
6. Read EVERY number, EVERY label, EVERY line of fine print. A tech's safety depends on accurate readings.
7. Use your knowledge to decode serial numbers for manufacture date and model numbers for capacity.
8. Capture ALL fine print — cautions, warnings, city acceptances, conductor requirements, installation notes.`;

const USER_PROMPT = `Read this equipment data tag photo. This could be HVAC or refrigeration equipment (AC, heat pump, furnace, condenser, walk-in cooler/freezer, reach-in, ice machine, display case, condensing unit, evaporator, compressor, etc.). Digitize EVERY piece of text and data visible into structured fields.

Use your knowledge to:
- Identify what each value on the tag means, even if labels are abbreviated (M=Model, S=Serial, MOD=Model, SER=Serial, etc.)
- Decode the serial number to determine manufacture date using the manufacturer's known serial format
- Determine tonnage/BTU/capacity from the model number if not explicitly printed
- Recognize certification logos and marks even if partially visible

Return ONLY valid JSON (no markdown fences, no explanation). Use null ONLY if the information is truly not on the tag and cannot be determined.

{
  "manufacturer": "Brand name (read from tag or identified from logo)",
  "assembled_in": "Country of assembly if stated",
  "model_number": "EXACT full model number — every character matters for parts ordering",
  "serial_number": "EXACT full serial number",
  "unit_type": "Type of unit (Air Conditioner, Heat Pump, Furnace, Condenser, Air Handler, Walk-In Cooler, Walk-In Freezer, Reach-In Cooler, Reach-In Freezer, Ice Machine, Display Case, Condensing Unit, Evaporator Coil, Compressor, Prep Table, etc.)",
  "manufacture_date": "Decoded from serial number or printed on tag (e.g. 2019)",
  "tonnage": "Tonnage if applicable — from tag or decoded from model number",
  "btu_cooling": "Cooling capacity BTU/hr — from tag or determined from model",
  "btu_heating": "Heating capacity BTU/hr if applicable",
  "seer": "SEER or SEER2 rating (HVAC)",
  "eer": "EER rating",
  "hspf": "HSPF rating (heat pumps)",
  "afue": "AFUE rating (furnaces)",
  "temperature_range": "Operating temperature range if listed (e.g. 35°F-38°F, -10°F to 0°F, Low Temp, Medium Temp)",
  "defrost_type": "Defrost type if listed (electric, hot gas, off-cycle, air, timed)",
  "refrigerant_type": "Refrigerant exactly as printed (e.g. HFC-410A, R-404A, R-134a, R-290)",
  "refrigerant_charge": "Factory charge exactly as printed (e.g. 6 lbs 6 oz)",
  "oil_type": "Compressor oil type if listed (e.g. POE, mineral, AB)",
  "oil_charge": "Oil charge amount if listed",
  "design_pressure_high": "High side design/test pressure with units",
  "design_pressure_low": "Low side design/test pressure with units",
  "voltage": "Voltage rating as printed (e.g. 208/230 Volts, 115V)",
  "voltage_min": "Minimum voltage if listed",
  "voltage_max": "Maximum voltage if listed",
  "phases": "Number of phases",
  "frequency": "Frequency (e.g. 60 Hz)",
  "min_circuit_ampacity": "MCA value — include secondary source MCA if noted",
  "max_overcurrent_protection": "Max fuse or breaker size — include HACR/NEC notes",
  "compressor_phase": "Compressor phase if listed",
  "compressor_rla": "Compressor Rated Load Amps",
  "compressor_lra": "Compressor Locked Rotor Amps",
  "fan_motor_phase": "Fan/evaporator motor phase if listed",
  "fan_motor_fla": "Fan motor Full Load Amps",
  "fan_motor_hp": "Fan motor horsepower",
  "blower_fla": "Indoor blower / evap fan FLA if present",
  "heater_amps": "Defrost heater amps if listed",
  "heater_watts": "Defrost heater watts if listed",
  "compressor_model": "Compressor model number if listed",
  "metering_device": "Metering device type if listed (TXV, TEV, cap tube, EEV)",
  "subcooling_spec": "Design subcooling if listed (e.g. 10 +/- 3°F DESIGN SUBCOOLING)",
  "line_charge_notes": "Liquid line charge addition instructions if listed",
  "filter_size": "Filter size if listed",
  "weight": "Unit weight if listed",
  "min_outdoor_temp": "Minimum outdoor/ambient operating temperature if listed",
  "max_ambient_temp": "Maximum ambient temperature if listed",
  "solar_secondary_power": "Secondary/solar power source specs if listed",
  "short_circuit_current": "Short circuit current rating if listed",
  "cfm": "Airflow in CFM if listed",
  "part_number": "Part number if listed (separate from model)",
  "product_number": "Product/PROD number if different from model",
  "drawing_number": "Drawing number (DWG.NO) if listed",
  "fan_identification": "Fan ID / F.ID. code if listed (e.g. SCP, BTS)",
  "outdoor_motor_voltage": "Outdoor/fan motor voltage if listed separately",
  "outdoor_motor_hp": "Outdoor/fan motor HP if listed separately",
  "certifications": ["Every certification visible — AHRI Certified, ETL Listed (with file numbers), UL Listed (with file numbers), CSA, NSF, CE, DOE, Energy Star, etc."],
  "additional_info": ["EVERY other piece of text not captured above — caution/attention warnings, city acceptances (Accepted for Use City of New York), conductor requirements (Use Copper Conductors Only), suitable for outdoor use/installation, HACR breaker notes (HACR CIRCUIT BREAKER FOR U.S. ONLY), feature names (Climatuff DuraTuff Spine Fin Quick-Sess Weathertron), dual USA/Canada ratings, installer instructions (INSTALLER TO MARK: TOTAL CHARGE), MEA numbers, R-numbers, drawing numbers, manufacturer address, QR codes, ANY remaining text. Each as a separate string. Miss NOTHING."],
  "raw_text": "Complete transcription of ALL text on the tag, line by line, using \\n. Every single word, number, and symbol visible."
}

Read EVERYTHING on the tag. Miss nothing.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // PASS 1: Read the tag with vision
    const pass1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 4000,
      }),
    });

    if (!pass1Response.ok) {
      const errText = await pass1Response.text();
      console.error('OpenAI Vision error:', errText);
      return NextResponse.json({ error: 'Image analysis failed' }, { status: 500 });
    }

    const pass1Data = await pass1Response.json();
    const pass1Usage = pass1Data.usage || {};
    let totalInputTokens = pass1Usage.prompt_tokens || 0;
    let totalOutputTokens = pass1Usage.completion_tokens || 0;
    const pass1Content = pass1Data.choices?.[0]?.message?.content?.trim();

    if (!pass1Content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let jsonStr = pass1Content;
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
    }

    const pass1Result = JSON.parse(jsonStr);

    // PASS 2: Web search for manufacturer tag format + serial decode, then enhance
    const manufacturer = pass1Result.manufacturer;
    const modelNumber = pass1Result.model_number;
    const serialNumber = pass1Result.serial_number;

    if (manufacturer && (modelNumber || serialNumber)) {
      try {
        const searches = await Promise.all([
          webSearch(`${manufacturer} ${modelNumber || ''} data tag nameplate specifications`),
          webSearch(`${manufacturer} serial number decode date of manufacture format`),
          modelNumber ? webSearch(`${manufacturer} ${modelNumber} tonnage BTU capacity specs`) : Promise.resolve(''),
        ]);

        const webContext = searches.filter(Boolean).join('\n\n');

        if (webContext.length > 100) {
          const enhanceResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              model: 'gpt-5-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You enhance HVAC/refrigeration equipment tag data using web search results. Return ONLY valid JSON.',
                },
                {
                  role: 'user',
                  content: `Here is data read from a ${manufacturer} equipment tag:\n\n${JSON.stringify(pass1Result, null, 2)}\n\nHere is web search data about this manufacturer and model:\n\n${webContext}\n\nUsing the web data, fill in any null fields that can be determined. Especially:\n- manufacture_date: decode the serial number "${serialNumber}" using ${manufacturer}'s known serial format\n- tonnage and btu_cooling: determine from model number "${modelNumber}" if not already set\n- Any other specs that can be confirmed from web data\n\nReturn the COMPLETE updated JSON object with all original fields preserved. Only update null fields or add accuracy. Do NOT change values that were already read from the tag. Return ONLY JSON.`,
                },
              ],
              temperature: 0,
              max_tokens: 4000,
            }),
          });

          if (enhanceResponse.ok) {
            const enhanceData = await enhanceResponse.json();
            const enhanceUsage = enhanceData.usage || {};
            totalInputTokens += enhanceUsage.prompt_tokens || 0;
            totalOutputTokens += enhanceUsage.completion_tokens || 0;
            const enhanceContent = enhanceData.choices?.[0]?.message?.content?.trim();
            if (enhanceContent) {
              let eJson = enhanceContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
              const eStart = eJson.indexOf('{');
              const eEnd = eJson.lastIndexOf('}');
              if (eStart !== -1 && eEnd !== -1) {
                eJson = eJson.slice(eStart, eEnd + 1);
              }
              const enhanced = JSON.parse(eJson);
              // Merge: keep original tag-read values, only fill in nulls from enhanced
              for (const key of Object.keys(enhanced)) {
                if (pass1Result[key] === null || pass1Result[key] === undefined) {
                  pass1Result[key] = enhanced[key];
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Enhancement pass error (non-fatal):', e);
      }
    }

    // Log AI usage costs
    const pass1Cost = calculateCost('gpt-5.4', pass1Usage.prompt_tokens || 0, pass1Usage.completion_tokens || 0);
    const totalCost = calculateCost('gpt-5.4', totalInputTokens, totalOutputTokens);
    const supabase = createServiceClient();
    supabase.from('agent_logs').insert({
      agent: 'tag_reader',
      action: 'scan',
      details: {
        model: 'gpt-5.4',
        manufacturer: pass1Result.manufacturer || null,
        model_number: pass1Result.model_number || null,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost: totalCost,
        pass1_cost: pass1Cost,
        used_enhancement: totalCost > pass1Cost,
      },
    } as Record<string, unknown>).then(() => {});

    return NextResponse.json(pass1Result);
  } catch (error) {
    console.error('Tag reader error:', error);
    return NextResponse.json({ error: 'Failed to analyze image. Please try again.' }, { status: 500 });
  }
}
