// Master parts list - shared across quote form and van inventory
// NOTE: A duplicate copy exists in supabase/functions/create-van-with-inventory/index.ts
// If you add/remove parts here, update the Edge Function copy as well.
export interface Part {
  item: string;
  description: string;
  category?: string;
}

export const PARTS_DATABASE: Part[] = [
  // Capacitors
  { item: "10RC", description: "10X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "125RC", description: "12.5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "15RC", description: "15X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "20RC", description: "20X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "25RC", description: "25X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "30RC", description: "30X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "35RC", description: "35X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "40RC", description: "40X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "45RC", description: "45X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "50RC", description: "50X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "5RC", description: "5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "75RC", description: "7.5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
  { item: "RC55", description: "55X440 MFD RUN CAPACITOR", category: "Capacitors" },
  { item: "355RCD", description: "35/5 MFD 440/370V DUAL RUN CAP 192175", category: "Capacitors" },
  { item: "405RCD", description: "40/5 MFD 440/370V DUAL RUN CAP 192178", category: "Capacitors" },
  { item: "445RCD", description: "44/5 MFD 440/370V DUAL RUN CAP 192181", category: "Capacitors" },
  { item: "555RCD", description: "55/5 MFD 440/370V DUAL RUN CAP 192185", category: "Capacitors" },
  { item: "805RCD", description: "80/5 MFD 440/370V DUAL RUN CAP 192193", category: "Capacitors" },
  { item: "SC108250", description: "108/250 ROUND START CAPACITOR", category: "Capacitors" },
  { item: "SC124250", description: "124/250 ROUND START CAPACITOR", category: "Capacitors" },
  { item: "SC130250", description: "130/250 ROUND START CAPACITOR", category: "Capacitors" },
  { item: "SC189250", description: "189/250 ROUND START CAPACITOR", category: "Capacitors" },
  { item: "SC233250", description: "233/250 ROUND START CAPACITOR", category: "Capacitors" },
  { item: "SC88250", description: "88/250 ROUND START CAPACITOR", category: "Capacitors" },
  { item: "SC88330", description: "88/330 ROUND START CAPACITOR", category: "Capacitors" },

  // Copper Fittings
  { item: "12C90LR", description: "1/2 LONG RADIUS COPPER 90", category: "Copper Fittings" },
  { item: "12C90LRST", description: "1/2 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
  { item: "12CC", description: "1/2 COPPER COUPLING", category: "Copper Fittings" },
  { item: "12CT", description: "1/2 COPPER TEE", category: "Copper Fittings" },
  { item: "34C90LR", description: "3/4 LONG RADIUS COPPER 90", category: "Copper Fittings" },
  { item: "34C90LRST", description: "3/4 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
  { item: "34CC", description: "3/4 COPPER COUPLING", category: "Copper Fittings" },
  { item: "34CT", description: "3/4 COPPER TEE", category: "Copper Fittings" },
  { item: "38C90LR", description: "3/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
  { item: "38C90LRST", description: "3/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
  { item: "38CC", description: "3/8 COPPER COUPLING", category: "Copper Fittings" },
  { item: "38CT", description: "3/8 COPPER TEE", category: "Copper Fittings" },
  { item: "58C90LR", description: "5/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
  { item: "58C90LRST", description: "5/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
  { item: "58CC", description: "5/8 COPPER COUPLING", category: "Copper Fittings" },
  { item: "58CT", description: "5/8 COPPER TEE", category: "Copper Fittings" },
  { item: "78C90LR", description: "7/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
  { item: "78C90LRST", description: "7/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
  { item: "78CC", description: "7/8 COPPER COUPLING", category: "Copper Fittings" },
  { item: "78CT", description: "7/8 COPPER TEE", category: "Copper Fittings" },

  // PVC Fittings
  { item: "1PVC90", description: "ELBOW PVC 1", category: "PVC Fittings" },
  { item: "1PVCCOUP", description: "COUPLING PVC 1", category: "PVC Fittings" },
  { item: "1PVCMPTAD", description: "ADAPTER PVC SXMPT 1", category: "PVC Fittings" },
  { item: "1PVCPIPE", description: "PIPE PVC 1 X 10 FT SCH 40", category: "PVC Fittings" },
  { item: "1PVCTEE", description: "1 PVC TEES", category: "PVC Fittings" },
  { item: "34PVC90", description: "ELBOW PVC 3/4", category: "PVC Fittings" },
  { item: "34PVCCAP", description: "3/4 PVC CAP", category: "PVC Fittings" },
  { item: "34PVCCOUP", description: "COUPLING PVC 3/4", category: "PVC Fittings" },
  { item: "34PVCFPTAD", description: "ADAPTER PVC SXFPT 3/4", category: "PVC Fittings" },
  { item: "34PVCMPTAD", description: "ADAPTER PVC SXMPT 3/4", category: "PVC Fittings" },
  { item: "34PVCPIPE", description: "PIPE PVC 3/4 X 10 FT SCH 40", category: "PVC Fittings" },
  { item: "34PVCTEE", description: "3/4 PVC TEES", category: "PVC Fittings" },
  { item: "34PVCUNION", description: "3/4 X 3/4 PVC SLIP UNION 94644", category: "PVC Fittings" },

  // Driers
  { item: "1216SWBFD", description: "1/2 X 16CI SW BI-FLOW DRIER", category: "Driers" },
  { item: "148SWD", description: "1/4 X 8CI SW DRIERS", category: "Driers" },
  { item: "3816SWD", description: "3/8 X 16CI SW DRIER", category: "Driers" },
  { item: "388SWD", description: "3/8 X 8CI SW DRIER", category: "Driers" },
  { item: "EPADR", description: "RECOVERY DRIER 032MF", category: "Driers" },

  // Fuses
  { item: "20FUSE250V", description: "FUSE 20 AMP 250V", category: "Fuses" },
  { item: "30FUSE250V", description: "FUSE 30 AMP 250V", category: "Fuses" },
  { item: "30FUSE600V", description: "FUSE 30 AMP 600V", category: "Fuses" },
  { item: "40FUSE250V", description: "FUSE 40 AMP 250V", category: "Fuses" },
  { item: "40FUSE600V", description: "FUSE 40 AMP 600V", category: "Fuses" },
  { item: "50FUSE250V", description: "FUSE 50 AMP 250V", category: "Fuses" },
  { item: "50FUSE600V", description: "FUSE 50 AMP 600V", category: "Fuses" },
  { item: "60FUSE250V", description: "FUSE 60 AMP 250V", category: "Fuses" },
  { item: "60FUSE600V", description: "FUSE 60 AMP 600V", category: "Fuses" },
  { item: "3FUSEATC", description: "FUSE 3 AMP ATC BLADE", category: "Fuses" },
  { item: "5FUSEATC", description: "FUSE 5 AMP ATC BLADE", category: "Fuses" },

  // Contactors
  { item: "2P40A120V", description: "40A 2P 120V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "2P40A240V", description: "40A 2P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "2P40A24V", description: "40A 2P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "3P40A120V", description: "40A 3P 120V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "3P40A240V", description: "40A 3P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "3P40A24V", description: "40A 3P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "3P60A240V", description: "60A 3P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
  { item: "3P60A24V", description: "60A 3P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },

  // Motors
  { item: "35WM", description: "35W CW 115 GE", category: "Motors" },
  { item: "6WM", description: "6W CW 115 GE MOTOR", category: "Motors" },
  { item: "9WM", description: "9W CW 115 GE MOTOR", category: "Motors" },
  { item: "CFM12230", description: "CFM 1/2 TE 230 1075", category: "Motors" },
  { item: "CFM12460", description: "CFM 1/2 TE 460 1075", category: "Motors" },
  { item: "CFM13230850", description: "CFM 1/3 TE 230 850 RPM", category: "Motors" },
  { item: "CFM14230", description: "CFM 1/4 TE 230 1075", category: "Motors" },
  { item: "CFM34230", description: "CFM 3/4 TE 230 1075", category: "Motors" },
  { item: "MTRRESC115230", description: "RESCUE MOTOR 115 230 VOLT", category: "Motors" },
  { item: "RM120115CWSEB", description: "MOTOR 1/20 115V CWSE BOHN", category: "Motors" },
  { item: "STR6WFANMO23", description: "STRU 6W FAN MOTOR 23", category: "Motors" },
  { item: "STREVAPMO", description: "EVAPORATOR FAN MOTOR", category: "Motors" },
  { item: "TRUMOTOR", description: "TRUE MOTOR COND ESP-L16EM1 16W", category: "Motors" },

  // Refrigerants
  { item: "R290", description: "R290 (14 OZ - USE PER OZ)", category: "Refrigerants" },
  { item: "R404", description: "R404A LB", category: "Refrigerants" },
  { item: "R407C", description: "R407C LB", category: "Refrigerants" },
  { item: "R410A", description: "R410A LB", category: "Refrigerants" },
  { item: "R448A", description: "R448A REFRIGERANT PER POUND", category: "Refrigerants" },
  { item: "R513A", description: "R513A LB", category: "Refrigerants" },

  // Relays & Controls
  { item: "SW120", description: "RELAY SWITCHING 90-341 120V", category: "Relays" },
  { item: "SW24", description: "RELAY SWITCHING 90-340 24V", category: "Relays" },
  { item: "SW240", description: "RELAY SWITCHING 90-342 240V", category: "Relays" },
  { item: "PR90380", description: "RELAY PEANUT 90-380", category: "Relays" },
  { item: "SSHREL220", description: "SOLID STATE HARDSTART RELAY 220-240VAC", category: "Relays" },
  { item: "HSR5", description: "RELAY HARDSTART TO-5", category: "Relays" },
  { item: "HS", description: "HEAT SEQUENCER", category: "Relays" },

  // Pressure Controls
  { item: "HPC", description: "CONTROL HIGH PRESSURE - P70AA-118C", category: "Pressure Controls" },
  { item: "HPCOND", description: "HIGH PRESSURE COND FAN CYCLING CONTROL", category: "Pressure Controls" },
  { item: "HPS", description: "HP SCREW ON SWITCH 3100-103", category: "Pressure Controls" },
  { item: "HPSA", description: "HIGH PRESSURE CONTROL SWITCH 101972", category: "Pressure Controls" },
  { item: "LPS", description: "LP SCREW ON SWITCH 3100-002", category: "Pressure Controls" },
  { item: "LPSA", description: "LOW PRESSURE CONTROL SWITCH 101985", category: "Pressure Controls" },

  // Thermostats & Sensors
  { item: "MSTAT", description: "WHITE ROGERS THERMOSTAT 1F56-444", category: "Thermostats" },
  { item: "MTSTAT", description: "STAT MED TEMP A30-261 CONTROLLER", category: "Thermostats" },
  { item: "WISTAT", description: "STAT WALKIN A19ABC-24C", category: "Thermostats" },
  { item: "T32PCLIENT", description: "CLIENT T STAT", category: "Thermostats" },
  { item: "IRTS-CLIENT", description: "INDOOR REMOTE TEMPERATURE SENSOR FOR T32", category: "Thermostats" },
  { item: "STRCARELDI", description: "STRU CAREL DISCHARGE/AIR PROBE", category: "Sensors" },
  { item: "STRDEFSEN", description: "STRU SB5766 DEFROST SENSOR", category: "Sensors" },

  // Venstar Controls
  { item: "VENCT414", description: "VENSTAR COMMUNICATING T/STAT", category: "Venstar" },
  { item: "VENECP4003", description: "VENSTAR EQUIP CONTROL PAC", category: "Venstar" },
  { item: "VENRS400", description: "VENSTAR REMOTE SEN-20 THERMISTOR", category: "Venstar" },
  { item: "VENRS410", description: "VENSTAR REMOTE SENSOR-WALL MOUNT", category: "Venstar" },
  { item: "VENRS420", description: "VENSTAR REMOTE SENSOR (BOH TUBE)", category: "Venstar" },
  { item: "VENSP400", description: "VENSTAR SENSOR PAC", category: "Venstar" },
  { item: "VENTIB515", description: "VENSTAR TRANE INTERFACE BOARD", category: "Venstar" },

  // Transformers
  { item: "40VAT", description: "TRANSFORMER 40VA", category: "Transformers" },
  { item: "75VAT", description: "TRANSFORMER FUSED 75VA", category: "Transformers" },

  // Electrical Connectors
  { item: "EBC10", description: "BUTT CONNECTOR #10", category: "Electrical" },
  { item: "EFC10", description: "FEMALE TERMINAL #10", category: "Electrical" },
  { item: "ETBC1614", description: "ELEC. BUTT CONNECTOR 16-14 EACH", category: "Electrical" },
  { item: "ETBC2218", description: "ELEC. BUTT CONNECTOR 22-18 EACH", category: "Electrical" },
  { item: "ETFC1210", description: "ELEC. FEMALE CONNECTOR 12-10 EACH", category: "Electrical" },
  { item: "ETFC1814", description: "ELEC. FEMALE CONNECTOR FLAG 18-14", category: "Electrical" },
  { item: "ETFCV1614", description: "ELEC. FEMALE CONNECTOR VINYL 16-14", category: "Electrical" },
  { item: "ETFORK1210", description: "ELEC. TERMINAL FORK 12-10 EACH", category: "Electrical" },
  { item: "ETFORK1614", description: "ELEC. TERMINAL FORK 16-14 EACH", category: "Electrical" },
  { item: "ETMFMST", description: "ELEC. MALE/FEMALE MULTISTACK MULTIS", category: "Electrical" },
  { item: "ETPTC1810", description: "ELEC. PIGTAIL CONNECTOR 18-10 EACH", category: "Electrical" },
  { item: "ETPTC2214", description: "ELEC. PIGTAIL CONNECTOR 22-14 EACH", category: "Electrical" },
  { item: "ETRING1210", description: "ELEC. TERMINAL RING 12-10 EACH", category: "Electrical" },
  { item: "ETRING1614", description: "ELEC. TERMINAL RING 16-14 EACH", category: "Electrical" },
  { item: "WNBLUE", description: "WIRE NUTS BLUE EACH", category: "Electrical" },
  { item: "WNORANGE", description: "WIRE NUTS ORANGE EACH", category: "Electrical" },
  { item: "WNRED", description: "WIRE NUTS RED EACH", category: "Electrical" },
  { item: "WNYELLOW", description: "WIRE NUTS YELLOW EACH", category: "Electrical" },
  { item: "WT11BL", description: "WIRE TIES 11 BLACK EACH", category: "Electrical" },

  // Wire
  { item: "THHN10", description: "WIRE THHN BLACK 10 GA PER FOOT", category: "Wire" },
  { item: "THHN12", description: "WIRE THHN BLACK 12 GA PER FOOT", category: "Wire" },
  { item: "THHN14", description: "WIRE THHN BLACK 14 GA PER FOOT", category: "Wire" },
  { item: "THHN8", description: "WIRE THHN BLACK 8 GA PER FOOT", category: "Wire" },
  { item: "LVW188", description: "LOW VOLTAGE WIRE 18-8 PER FT", category: "Wire" },
  { item: "SJC", description: "SJ CORD 12/3 PER FOOT", category: "Wire" },

  // Ice Machine Parts
  { item: "ICECLP", description: "ICE MACHINE CLEANER-PINT", category: "Ice Machine" },
  { item: "ICECONDFAN", description: "ICE CONFANMTR 208/230V1506H", category: "Ice Machine" },
  { item: "ICECURTALA", description: "ICE CURTAIN LOWER ASSEMBLY", category: "Ice Machine" },
  { item: "ICEFLOATSK", description: "ICE FLOAT SWITCH KIT", category: "Ice Machine" },
  { item: "ICEFLOATVA", description: "ICE FLOAT VA", category: "Ice Machine" },
  { item: "ICEHARVEAS", description: "ICE HARVEST ASSIST 230V", category: "Ice Machine" },
  { item: "ICEMOTOFAN", description: "ICE MOTOR FAN 230V", category: "Ice Machine" },
  { item: "ICEPUMP230", description: "ICE H2O PUMP230V1506HR", category: "Ice Machine" },
  { item: "ICERIBSWI", description: "ICE RIBBON SWITCH", category: "Ice Machine" },
  { item: "ICESWITFCY", description: "ICE SWITCH FAN CYCLE", category: "Ice Machine" },
  { item: "ICETIMERMO", description: "ICE TIMER MODULE", category: "Ice Machine" },
  { item: "ICETUBEWDI", description: "ICE TUBE WATER DISTRIBUTION", category: "Ice Machine" },
  { item: "ICEVALVEPU", description: "ICE VALVE PURGE 230", category: "Ice Machine" },
  { item: "ICEVALVEWATERIN", description: "VALVE WATER INLET 240V", category: "Ice Machine" },
  { item: "ICEWATERPUMPASS", description: "WATER PUMP ASSY", category: "Ice Machine" },

  // True Refrigeration Parts
  { item: "TRUBTMHINAS", description: "TRUE BTM HINGE ASSEMBLY", category: "True Parts" },
  { item: "TRUCOLDCON", description: "TRUE COLD CONTROL TR", category: "True Parts" },
  { item: "TRUCTRLTEMP", description: "TRUE CONTROL TEMP", category: "True Parts" },
  { item: "TRUDRAINELBOW811501", description: "TRUE EVAP DRAIN ELBOW", category: "True Parts" },
  { item: "TRUDRNWICKPAD", description: "TRUE DRAIN PAN WICKING PAD", category: "True Parts" },
  { item: "TRUHEATERTUBE801849", description: "TRUE HEATER DRAIN TUBE", category: "True Parts" },
  { item: "TRULEDLIGSTR", description: "TRUE LED LIGHT STRIP", category: "True Parts" },
  { item: "TRULEDWIRHAR", description: "TRUE LED WIRE HARNESS", category: "True Parts" },
  { item: "TRULHCARTHIN", description: "TRUE LH CARTRIDGE HINGE", category: "True Parts" },
  { item: "TRUPIN", description: "TRUE PIN SWING DR HINGE SHFT/PIN", category: "True Parts" },
  { item: "TRURHCARTHIN", description: "TRUE RH CARTRIDGE HINGE", category: "True Parts" },
  { item: "TRUSCREW", description: "TRUE SCREWS SHELF STANDARD 10-32", category: "True Parts" },
  { item: "TRUSHELFCL", description: "TRUE SHELF CLIPS", category: "True Parts" },
  { item: "TRUTOPHIN", description: "TRUE DOOR HINGE KIT TOP RT OR LT", category: "True Parts" },
  { item: "TRUTOPHINAS", description: "TRUE TOP HINGE ASSEMBLY", category: "True Parts" },
  { item: "TRUUNIVCBIT25", description: "TRUE UNIV CNTRL BIT25 KIT", category: "True Parts" },
  { item: "TRUWICKING", description: "TRUE WICKING KIT CON", category: "True Parts" },

  // Strutherford Parts
  { item: "STRPOWERSW", description: "STRU POWER SWITCH 2PST", category: "Strutherford" },
  { item: "STRWICK", description: "STRU WICKING MAT", category: "Strutherford" },

  // Switches & Floats
  { item: "FS", description: "FLOAT SWITCH 1502UR", category: "Switches" },
  { item: "FSO", description: "OVER FLOW SWITCH 118955", category: "Switches" },
  { item: "FSP", description: "DRAIN PAN SWITCH 118956", category: "Switches" },
  { item: "LS160", description: "LIMIT SWITCH 160", category: "Switches" },
  { item: "LS190", description: "LIMIT SWITCH 190", category: "Switches" },
  { item: "DTC814520", description: "CLOCK DEFROST 8145-20 230V", category: "Switches" },

  // Solenoids & Valves
  { item: "38LLS", description: "SOLENOID 3/8 SW", category: "Valves" },
  { item: "38SG", description: "SITE GLASS 3/8 M X F", category: "Valves" },
  { item: "LLSC120240", description: "SOLENOID COIL 120/240", category: "Valves" },
  { item: "UGV", description: "UNIVERSAL GAS VALVE", category: "Valves" },
  { item: "VALCAP", description: "FLARE CAPS 1/4 EACH", category: "Valves" },
  { item: "VCORE", description: "VALVE CORES CD4450B EACH", category: "Valves" },

  // Pumps
  { item: "2R322D", description: "115V CONDENSATE PUMP", category: "Pumps" },
  { item: "PUMPASSYMINI", description: "PUMP ASSY MINIBULE 115V", category: "Pumps" },
  { item: "UNIVCPUMP110", description: "UNIV PUMP COND 110-250V", category: "Pumps" },

  // Ignition
  { item: "HSIT", description: "HOT SURFACE IGNITORS TRANE", category: "Ignition" },
  { item: "UIIM", description: "UNIVERSAL INTERMITTENT IGNITION MODULE", category: "Ignition" },
  { item: "THCO60", description: "THERMOCOUPLES 60", category: "Ignition" },

  // Time Delays
  { item: "TDADOB", description: "TIME DELAY ADJ DOB", category: "Time Delays" },
  { item: "TDADOM", description: "TIME DELAY ADJ DOM", category: "Time Delays" },

  // Belts
  { item: "A26", description: "A26 BELT", category: "Belts" },
  { item: "A32", description: "A32 BELT", category: "Belts" },
  { item: "A35", description: "A35 BELT", category: "Belts" },
  { item: "A36", description: "A36 BELT", category: "Belts" },
  { item: "A38", description: "A38 BELT", category: "Belts" },
  { item: "A39", description: "A39 BELT", category: "Belts" },
  { item: "A40", description: "A40 BELT", category: "Belts" },
  { item: "A44", description: "A44 BELT", category: "Belts" },
  { item: "A47", description: "A47 BELT", category: "Belts" },
  { item: "A48", description: "A48 BELT", category: "Belts" },
  { item: "A49", description: "A49 BELT", category: "Belts" },
  { item: "A52", description: "A52 BELT", category: "Belts" },
  { item: "A53", description: "A53 BELT", category: "Belts" },
  { item: "A54", description: "A54 BELT", category: "Belts" },
  { item: "LNKBELTA", description: "LINK BELT A", category: "Belts" },
  { item: "LNKBELTB", description: "LINK BELT B", category: "Belts" },

  // Hardware
  { item: "101STSCR", description: "10 X1 SELF TAPPING SCREWS (500)", category: "Hardware" },
  { item: "812STSCR", description: "8 X1/2 SELF TAPPING SCREWS (500)", category: "Hardware" },
  { item: "12NUT", description: "HEX NUT 1/2", category: "Hardware" },
  { item: "38FW", description: "FENDER WASHER 3/8", category: "Hardware" },
  { item: "38LW", description: "LOCK WASHER 3/8", category: "Hardware" },
  { item: "38NUT", description: "HEX NUT 3/8", category: "Hardware" },
  { item: "38NUTCOMP", description: "NUTS COMP 3/8 61-6", category: "Hardware" },
  { item: "ANC", description: "ANCHOR KIT 10 X 1-1/4 HEX EACH", category: "Hardware" },
  { item: "716X1HC", description: "HOSE CLAMP 7/16 X 1", category: "Hardware" },
  { item: "STRAP", description: "GALV. STRAP 1 FOOT", category: "Hardware" },
  { item: "PDT", description: "DUCT STRAPS 36 INCH", category: "Hardware" },

  // Access Tubes
  { item: "14ACCTUBE", description: "ACCESS TUBES 1/4 CD3604", category: "Access Tubes" },
  { item: "18ACCTUBE", description: "ACCESS TUBES 1/8 CD3608", category: "Access Tubes" },
  { item: "316ACCTUBE", description: "ACCESS TUBES 3/16 CD3603", category: "Access Tubes" },

  // Soldering
  { item: "15SS", description: "SOLDER 15% PER STICK", category: "Soldering" },
  { item: "45SS", description: "45% SILVER SOLDER", category: "Soldering" },
  { item: "ACE", description: "ACETYLENE PER USE", category: "Soldering" },
  { item: "OXY", description: "OXYGEN PER USE", category: "Soldering" },
  { item: "MAPGAS", description: "MAPP GAS 14.1OZ", category: "Soldering" },
  { item: "ALUROD", description: "ALUMINUM FLUX CORED RODS", category: "Soldering" },

  // Chemicals & Cleaners
  { item: "ACID", description: "ACID A WAY", category: "Chemicals" },
  { item: "ATK", description: "ACID TEST KIT QT2000", category: "Chemicals" },
  { item: "CCCL", description: "CONDENSER CLEANER CCL GALLON", category: "Chemicals" },
  { item: "ECCL", description: "EVAP CLEANER CCL PER USE 1/2 GAL", category: "Chemicals" },
  { item: "DEGR", description: "DEGREASER VIRGINIA 10", category: "Chemicals" },
  { item: "DSA", description: "SPRAY ADHESIVE PER CAN", category: "Chemicals" },
  { item: "LKDETBLU", description: "LEAK DETECTOR BIG BLUE PER USE", category: "Chemicals" },
  { item: "LLOCK", description: "LEAK LOCK EACH", category: "Chemicals" },
  { item: "NEVSEE", description: "NEVERSEEZE 8 OZ BRUSH TOP PER USE", category: "Chemicals" },
  { item: "PVCGLUE", description: "GLUE PVC 1/4 PT", category: "Chemicals" },
  { item: "PVCPRIMER", description: "PRIMER PVC 1/2 PT", category: "Chemicals" },
  { item: "CGP", description: "COLD GALVANIZED PAINT", category: "Chemicals" },
  { item: "GREASE", description: "GREASE CARTRIDGE", category: "Chemicals" },
  { item: "THTRAP", description: "HEAT PASTE THERMO TRAP PER USE", category: "Chemicals" },
  { item: "WASPSPRAY", description: "WASP/HORNET SPRAY", category: "Chemicals" },
  { item: "WD40", description: "WD40 11 OZ PER USE", category: "Chemicals" },
  { item: "VPO1QT", description: "VACUUM PUMP OIL 1 QT", category: "Chemicals" },

  // Tape & Adhesives
  { item: "ELECTAPE", description: "ELECTRICAL TAPE PER YARD", category: "Tape" },
  { item: "TTAPE", description: "TAPE TEFLON PER FOOT", category: "Tape" },
  { item: "BLDT", description: "DUCT TAPE 2 BLACK PER YARD", category: "Tape" },
  { item: "FODT", description: "DUCT TAPE FOIL 2-1/2 UL PER YARD", category: "Tape" },
  { item: "CTAPE", description: "TAPE CORK PER FOOT", category: "Tape" },
  { item: "FTAPE", description: "TAPE FOAM PER FOOT", category: "Tape" },
  { item: "SCL", description: "SAND CLOTH 1-1/2 IN PER FOOT", category: "Tape" },
  { item: "ABPA", description: "ABRASIVE PADS EA", category: "Tape" },
  { item: "PIPESEAL", description: "PIPE THREAD SEALANT", category: "Tape" },
  { item: "CAULKCL", description: "CAULKING CLEAR", category: "Tape" },

  // Batteries
  { item: "BAT9", description: "BATTERY 9V ALKALINE", category: "Batteries" },
  { item: "BATAA", description: "BATTERY AA ALKALINE", category: "Batteries" },
  { item: "BATAAA", description: "BATTERY AAA ALKALINE", category: "Batteries" },

  // Nitrogen
  { item: "NITRO", description: "NITROGEN 40", category: "Gases" },

  // Shop Supplies
  { item: "SCRUBS", description: "SCRUBS IN A BUCKET", category: "Shop Supplies" },
  { item: "SRAGS", description: "SHOP TOWELS", category: "Shop Supplies" },
  { item: "SPOIL", description: "ZOOM SPOUT OILER", category: "Shop Supplies" },
  { item: "KNB", description: "NUT & BOLT (FASTENER KIT)", category: "Shop Supplies" },

  // Drain Line
  { item: "SH503", description: "DRAIN LINE HEATER", category: "Drain" },
  { item: "PT", description: "PAN TABS EACH", category: "Drain" },
  { item: "SWTEE", description: "SWIVEL TEE", category: "Drain" },

  // Miscellaneous
  { item: "MP", description: "CORD END MALE", category: "Misc" },
  { item: "PHMON", description: "3 PHASE MONITOR", category: "Misc" },
];

// Search function for autocomplete
export function searchParts(query: string): Part[] {
  if (!query || query.length < 1) return [];
  const lowerQuery = query.toLowerCase();
  return PARTS_DATABASE.filter(
    (part) =>
      part.item.toLowerCase().includes(lowerQuery) ||
      part.description.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit to 10 results
}

// Get part by item number
export function getPartByItem(item: string): Part | undefined {
  return PARTS_DATABASE.find((p) => p.item.toLowerCase() === item.toLowerCase());
}
