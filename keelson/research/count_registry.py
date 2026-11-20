import sys, collections, re, openpyxl, warnings
warnings.filterwarnings("ignore")
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
ws = wb.worksheets[0]
rows = ws.iter_rows(values_only=True); header = next(rows)
idx = {h:i for i,h in enumerate(header)}
prov = collections.Counter(); main = collections.Counter(); sub = collections.Counter()
bc_main = collections.Counter(); gt_le15 = 0; total = 0; prop = collections.Counter()
mainsub = collections.Counter()
for r in rows:
    total += 1
    num = (r[idx['Official Number']] or '')
    m = re.search(r'([A-Z]{2})$', num); p = m.group(1) if m else '??'
    prov[p] += 1
    md = r[idx['Main Descriptor']]; s1 = r[idx['Sub Descriptor 1']]
    main[md] += 1; mainsub[(md, s1)] += 1
    if p == 'BC': bc_main[md] += 1
    gt = r[idx['Vessel Gross Tonnage']]
    try:
        if gt is not None and float(gt) <= 15: gt_le15 += 1
    except: pass
    prop[r[idx['Propulsion Type']]] += 1
print("TOTAL", total, " GT<=15:", gt_le15)
print("BY PROVINCE", prov.most_common())
print("MAIN DESCRIPTOR", main.most_common())
print("BC MAIN", bc_main.most_common())
print("PROPULSION", prop.most_common())
print("TOP MAIN/SUB", mainsub.most_common(40))
