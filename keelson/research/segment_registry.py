import sys, collections, re, openpyxl, warnings
warnings.filterwarnings("ignore")
ws = openpyxl.load_workbook(sys.argv[1], read_only=True).worksheets[0]
rows = ws.iter_rows(values_only=True); header = next(rows); ix = {h:i for i,h in enumerate(header)}
GOV = {'Enforcement','Patrol','Search and Rescue','Rescue','Emergency Response','Fishing Protection','Pollution Oil Spill Response','Research','Fishing Research'}
years = collections.Counter(); bc = collections.Counter(); seg = collections.Counter(); segbc = collections.Counter()
for r in rows:
    num = r[ix['Official Number']] or ''; p = num[-2:]
    md = r[ix['Main Descriptor']]; s1 = r[ix['Sub Descriptor 1']]
    y = (r[ix['Certificate First Registry Date']] or '')[:4]; years[y]+=1
    prop = r[ix['Propulsion Type']]
    if md in ('Fishing','Human-powered','CG auxiliary'): s='excluded/unlikely (fishing, human-powered, CG auxiliary)'
    elif md in ('Barge',) and prop=='Non Propelled': s='likely excluded (non-propelled barge)'
    elif md in ('Passenger','Pontoon','Ferry','Fishing/Passenger') and (s1 or '')!='Workboat': s='passenger-carrying (Class 4B / 4)'
    elif md=='Tug': s='tug/towboat (Class 4B)'
    elif s1 in GOV: s='workboat - public-sector style use (enforcement, SAR, research...)'
    else: s='workboat / other commercial (mostly Class 5)'
    seg[s]+=1
    if p=='BC': segbc[s]+=1
print("SEGMENTS CANADA"); [print(f"  {v:6}  {k}") for k,v in seg.most_common()]
print("SEGMENTS BC"); [print(f"  {v:6}  {k}") for k,v in segbc.most_common()]
print("FIRST REGISTRY YEAR (recent)"); [print(" ",y,years[y]) for y in sorted(years) if y>='2018']
