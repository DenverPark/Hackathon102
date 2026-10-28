from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'backend/data/nylon-wool.json').read_text(encoding='utf-8'))
assert len(data['fabrics'])==2 and len(data['evidence'])==13
ids={s['id'] for s in data['sources']}
assert all(e['source_id'] in ids for e in data['evidence'])
for s in data['sources']:
 s['document_name']=data['document']['name'];s['checked_at']=data['document']['review_date']
for e in data['evidence']:e['usable_as_actual_measurement']=False
# Explicit columns prevent unrelated defaults from being overwritten.
sql="begin;\nalter table public.lm_fabrics add column if not exists profile_details jsonb not null default '{}'::jsonb;\n"
for name,cols in [('sources',['id','title','url','document_name','locator','evidence_status','limitations','checked_at']),('fabrics',['id','name','category','composition','structure','stretch','summary','source_ids','data_gaps','profile_details']),('evidence',['id','fabric_id','source_id','property','reported_value','sample_description','conditions','applicability','usable_as_actual_measurement'])]:
 values=json.dumps(data[name],ensure_ascii=False,separators=(',',':'))
 columns=','.join(cols)
 sql+=f"insert into public.lm_{name}({columns}) select {columns} from jsonb_populate_recordset(null::public.lm_{name},$data${values}$data$::jsonb) on conflict(id) do update set "+','.join(f'{c}=excluded.{c}' for c in cols if c!='id')+';\n'
sql+="commit;\nselect 'nylon_wool_data_applied' as status;\n"
(root/'backend/updates/nylon-wool-data.sql').write_text(sql,encoding='utf-8')
