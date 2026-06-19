#!/usr/bin/env python3
# Извлекает курированные реальные данные из агро-реестров (data/) → src/registryData.ts
# Источники: реестр пестицидов (XML), удобрения (XML), оригинаторы (xlsx), госреестр сортов (PDF).
# Где параметров нет (цены/прибавки) — числа добавляются на стороне приложения (демо).
import re, os, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', '..', 'data'))
OUT = os.path.join(HERE, '..', 'src', 'registryData.ts')

CROPS = ['Подсолнечник', 'Кукуруза', 'Соя', 'Пшеница', 'Ячмень', 'Горох']
def crop_match(s):
    s = (s or '').lower()
    for c, key in [('Подсолнечник','подсолнеч'),('Кукуруза','кукуруз'),('Соя','соя'),('Пшеница','пшениц'),('Ячмень','ячмен'),('Горох','горох')]:
        if key in s: return c
    return None
def clean(s): return re.sub(r'\s+', ' ', html.unescape(s or '')).strip()

# ── 1. ПЕСТИЦИДЫ ──
def extract_szr():
    txt = open(os.path.join(DATA, 'Реестр пестицидов.xml'), encoding='utf-8').read()
    blocks = txt.split('<fulldataset3>')[1:]
    total = len(blocks)
    out, by_type = [], {}
    for b in blocks:
        naz = clean((re.search(r'<naznachenie>(.*?)</naznachenie>', b, re.S) or [None, ''])[1] if re.search(r'<naznachenie>(.*?)</naznachenie>', b, re.S) else '')
        nm = re.search(r'<Naimenovanie>\s*<item>(.*?)</item>', b, re.S)
        name = clean(nm.group(1)) if nm else ''
        if not name or not naz: continue
        form = clean((re.search(r'<Preparativnaya_forma>\s*<item>(.*?)</item>', b, re.S) or re.search(r'<Preparativnaya_forma>(.*?)</Preparativnaya_forma>', b, re.S)).group(1)) if re.search(r'<Preparativnaya_forma>', b) else ''
        ais = re.findall(r'<Deystvuyushee_veshestvo>(.*?)</Deystvuyushee_veshestvo>\s*<Tip_koncentracii>.*?</Tip_koncentracii>\s*<Koncentraciya>(.*?)</Koncentraciya>\s*<Ed_Izveren_1>(.*?)</Ed_Izveren_1>', b, re.S)
        ai = ', '.join(f"{clean(a)} {clean(c)} {clean(u).lower()}" for a, c, u in ais[:2]) if ais else clean((re.search(r'<Deystvuyushee_veshestvo>(.*?)</Deystvuyushee_veshestvo>', b, re.S) or [None,''])[1]) if re.search(r'<Deystvuyushee_veshestvo>', b) else ''
        # первое применение по нашей культуре (теги Kultura/Vrednyy не обязаны быть смежными)
        crop, target = None, ''
        for kult in re.findall(r'<Kultura_obrabatyvaemyy_obekt>(.*?)</Kultura_obrabatyvaemyy_obekt>', b, re.S):
            c = crop_match(kult)
            if c: crop = c; break
        if not crop: continue
        vm = re.search(r'<Vrednyy_obekt_naznachenie>(.*?)</Vrednyy_obekt_naznachenie>', b, re.S)
        target = clean(vm.group(1)) if vm else ''
        rec = {'name': name, 'type': naz, 'form': form, 'ai': ai, 'crop': crop, 'target': target[:90]}
        t = naz
        by_type.setdefault(t, [])
        if len(by_type[t]) < 14 and not any(r['name'] == name for r in by_type[t]):
            by_type[t].append(rec); out.append(rec)
    return total, out
# ── 2. УДОБРЕНИЯ ──
def extract_fert():
    txt = open(os.path.join(DATA, 'Удобрения комплексные минеральные.xml'), encoding='utf-8').read()
    blocks = txt.split('<preparat>')
    total = len(blocks) - 1
    out, seen = [], set()
    for b in blocks[1:]:
        name = clean(b.split('</preparat>')[0]).rstrip(' :')
        if not name or name in seen: continue
        grp = clean((re.search(r'<Group>(.*?)</Group>', b, re.S) or [None,''])[1]) if re.search(r'<Group>', b) else ''
        dose = clean((re.search(r'<Doza_primeneniya>(.*?)</Doza_primeneniya>', b, re.S) or [None,''])[1]) if re.search(r'<Doza_primeneniya>', b) else ''
        kult = clean((re.search(r'<Kultura_obrabatyvaemyy_obekt>(.*?)</Kultura_obrabatyvaemyy_obekt>', b, re.S) or [None,''])[1]) if re.search(r'<Kultura_obrabatyvaemyy_obekt>', b) else ''
        npk = (re.search(r'(\d{1,2}[-:]\d{1,2}[-:]\d{1,2})', name + ' ' + grp) or [None,''])[1] if re.search(r'\d{1,2}[-:]\d{1,2}[-:]\d{1,2}', name + ' ' + grp) else ''
        seen.add(name)
        out.append({'name': name[:60], 'group': grp[:50], 'npk': npk, 'dose': dose[:60], 'crop': kult[:40]})
        if len(out) >= 28: break
    return total, out
# ── 3. ОРИГИНАТОРЫ + СОРТА (xlsx) ──
def extract_varieties():
    import openpyxl
    wb = openpyxl.load_workbook(os.path.join(DATA, 'Реестр оригинаторов - Основной 05.05.2025.xlsx'), read_only=True)
    ws = wb.active
    cur_o, cur_c = '', ''
    per_crop, origs, total = {}, [], 0
    for r in ws.iter_rows(min_row=6, values_only=True):
        o = clean(str(r[0])) if r[0] else ''
        c = clean(str(r[3])) if len(r) > 3 and r[3] else ''
        s = clean(str(r[5])) if len(r) > 5 and r[5] else ''
        if o and 'Параметры' not in o and o != 'Оригинатор':
            cur_o = o
            if o not in origs: origs.append(o)
        if c: cur_c = c
        if s and s != 'Сорт':
            cm = crop_match(cur_c)
            if cm:
                total += 1
                per_crop.setdefault(cm, [])
                if len(per_crop[cm]) < 16 and not any(v['name'] == s for v in per_crop[cm]):
                    per_crop[cm].append({'crop': cm, 'name': s[:40], 'originator': cur_o[:40]})
    varieties = [v for lst in per_crop.values() for v in lst]
    return total, varieties, origs[:50]
# ── 4. ТЕХНИКА (PDF) ──
def extract_tech():
    import subprocess
    try:
        t = subprocess.check_output(['pdftotext', '-layout', os.path.join(DATA, 'Перечень сельскохозяйственной техники.pdf'), '-'], text=True)
    except Exception:
        return 0, []
    makers = ['Ростсельмаш','Кировец','Петербургский','John Deere','Claas','Amazone','Väderstad','Гомсельмаш','Брянсксельмаш','МТЗ','Беларус','РСМ','Лилиани','Пегас']
    out, seen = [], set()
    for line in t.splitlines():
        ln = clean(line)
        if len(ln) < 6 or len(ln) > 90: continue
        for mk in makers:
            if mk.lower() in ln.lower():
                # модель — последний токен в «кавычках» (там обычно марка), иначе кусок с цифрой
                qs = re.findall(r'«([^«»]{2,40})»', ln)
                mdl = qs[-1] if qs and not any(m.lower() in qs[-1].lower() for m in ['Ростсельмаш','Петербургский','Гомсельмаш','Брянсксельмаш']) else (re.search(r'([A-ZА-Я][\w\-]* ?\d{2,4}[\w\-]*)', ln) or [None, ln[:36]])[1]
                key = clean(mdl)[:40]
                if key and key not in seen:
                    seen.add(key); out.append({'name': key, 'maker': mk})
                break
        if len(out) >= 30: break
    return len(out), out

szr_total, szr = extract_szr()
fert_total, fert = extract_fert()
var_total, varieties, origs = extract_varieties()
tech_total, tech = extract_tech()

def js(arr): return json.dumps(arr, ensure_ascii=False)
ts = f'''// АВТО-СГЕНЕРИРОВАНО scripts/extractRegistries.py из реальных агро-реестров (data/).
// Курированная выборка под культуры фермы. Коммерческие показатели (цены/прибавки) — в приложении (демо).
export type RegSzr = {{ name: string; type: string; form: string; ai: string; crop: string; target: string }}
export type RegFert = {{ name: string; group: string; npk: string; dose: string; crop: string }}
export type RegVariety = {{ crop: string; name: string; originator: string }}
export type RegTech = {{ name: string; maker: string }}

export const REG_COUNTS = {{ szr: {szr_total}, fert: {fert_total}, varieties: {var_total}, originators: {len(origs)}, tech: {tech_total} }}
export const REG_SZR: RegSzr[] = {js(szr)}
export const REG_FERT: RegFert[] = {js(fert)}
export const REG_VARIETIES: RegVariety[] = {js(varieties)}
export const REG_ORIGINATORS: string[] = {js(origs)}
export const REG_TECH: RegTech[] = {js(tech)}
'''
open(OUT, 'w', encoding='utf-8').write(ts)
print(f'SZR {len(szr)}/{szr_total} · FERT {len(fert)}/{fert_total} · VAR {len(varieties)}/{var_total} · ORIG {len(origs)} · TECH {len(tech)}')
print('crops in varieties:', sorted(set(v["crop"] for v in varieties)))
print('szr types:', sorted(set(s["type"] for s in szr)))
print('sample szr:', szr[0] if szr else None)
print('sample var:', varieties[0] if varieties else None)
print('sample fert:', fert[0] if fert else None)
print('sample tech:', tech[:3])
