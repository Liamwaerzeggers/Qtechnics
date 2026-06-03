"""
Seed standaard materiaalprofielen — Fase 2C van het Max Q Project Intelligence Platform.

Seedt (idempotent, slaat bestaande namen over):
- ~21 standaard werkposten met realistische materiaalprofielen (basis + hulpmaterialen),
  inclusief snijverlies, status (verplicht/aanbevolen/optioneel), reden en verpakkingsafronding.
- Aparte sanitaire plaatsings-werkposten (per toestel) met aansluitmateriaal-profiel.
- De benodigde materialen in de materiaalbibliotheek (zonder prijs → zelflerend).

Gangbare bouwwaarden als default; nadien manueel aanpasbaar.
"""
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def m(name, qpu, unit, status="verplicht", role="basis", reason=None, waste=0.0, pkg=None, round_pkg=False, margin=0.0):
    """Bouw een materiaalprofiel-entry."""
    return {
        "material_id": None,
        "material_name": name,
        "quantity_per_unit": qpu,
        "unit": unit,
        "status": status,
        "role": role,
        "reason": reason,
        "waste_percent": waste,
        "safety_margin_percent": margin,
        "package_qty": pkg,
        "round_to_package": round_pkg,
    }


# (naam, categorie, eenheid, default_source, productiviteit/mandag, [materiaalregels])
WERKPOST_SEED = [
    # ---------------- GYPROC ----------------
    ("Gyproc wand", "Gyproc", "m²", "wall_area_net", 20, [
        m("Gyproc plaat 12.5mm", 0.34, "stuk", waste=5, pkg=1, round_pkg=True, reason="1 plaat = 3m²; incl. snijverlies"),
        m("CD-profiel 60/27", 0.9, "lm", "verplicht", "hulp", "Draagprofielen wandstructuur", waste=5),
        m("UD-profiel 28/27", 0.7, "lm", "verplicht", "hulp", "Randprofielen omtrek", waste=5),
        m("Snelbouwschroeven", 17, "stuk", "verplicht", "hulp", "Bevestiging platen op profiel", waste=5, pkg=1000, round_pkg=True),
        m("Voegband (scrim)", 1.5, "lm", "verplicht", "hulp", "Versteviging voegen"),
        m("Voegmiddel", 0.4, "kg", "verplicht", "hulp", "Voegen dichten", pkg=20, round_pkg=True),
        m("Hoekprofiel", 0.1, "lm", "aanbevolen", "hulp", "Beschermen buitenhoeken"),
        m("Primer", 0.1, "liter", "optioneel", "hulp", "Bij sterk zuigende ondergrond"),
    ]),
    ("Gyproc plafond", "Gyproc", "m²", "ceiling_area", 16, [
        m("Gyproc plaat 12.5mm", 0.34, "stuk", waste=8, pkg=1, round_pkg=True, reason="Plafond: meer snijverlies"),
        m("CD-profiel 60/27", 1.1, "lm", "verplicht", "hulp", "Draagprofielen plafond", waste=5),
        m("UD-profiel 28/27", 0.5, "lm", "verplicht", "hulp", "Randprofielen omtrek", waste=5),
        m("Plafondophanger (hanger)", 1.4, "stuk", "verplicht", "hulp", "Ophangen plafondstructuur", pkg=100, round_pkg=True),
        m("Snelbouwschroeven", 20, "stuk", "verplicht", "hulp", "Bevestiging platen", pkg=1000, round_pkg=True),
        m("Voegband (scrim)", 1.5, "lm", "verplicht", "hulp", "Versteviging voegen"),
        m("Voegmiddel", 0.45, "kg", "verplicht", "hulp", "Voegen dichten", pkg=20, round_pkg=True),
    ]),
    # ---------------- PLEISTERWERKEN ----------------
    ("Pleisterwerken muren", "Pleisterwerken", "m²", "wall_area_net", 18, [
        m("MP75 gipspleister", 9.0, "kg", reason="±9 kg/m² bij 10mm dikte", waste=5, pkg=30, round_pkg=True),
        m("Hoekprofiel (pleister)", 0.1, "lm", "verplicht", "hulp", "Hoekbescherming"),
        m("Primer/voorstrijk", 0.15, "liter", "aanbevolen", "hulp", "Hechting/zuigremmer"),
        m("Afplakband", 0.2, "lm", "optioneel", "hulp", "Afplakken aansluitingen"),
    ]),
    ("Pleisterwerken plafond", "Pleisterwerken", "m²", "ceiling_area", 14, [
        m("MP75 gipspleister", 9.5, "kg", reason="Plafond pleisterwerk", waste=8, pkg=30, round_pkg=True),
        m("Primer/voorstrijk", 0.15, "liter", "aanbevolen", "hulp", "Hechting"),
    ]),
    # ---------------- SCHILDERWERKEN ----------------
    ("Schilderwerken muren", "Schilderwerken", "m²", "wall_area_net", 35, [
        m("Muurverf (eindlaag)", 0.25, "liter", reason="2 lagen, ±0.125 L/laag/m²", waste=5, pkg=10, round_pkg=True),
        m("Primer/grondverf", 0.12, "liter", "aanbevolen", "hulp", "Egaliseren ondergrond", pkg=10, round_pkg=True),
        m("Plamuur/vulmiddel", 0.05, "kg", "aanbevolen", "hulp", "Wegwerken oneffenheden"),
        m("Schuurpapier", 0.05, "stuk", "verplicht", "hulp", "Voorbereiding ondergrond"),
        m("Afplaktape", 0.3, "lm", "verplicht", "hulp", "Afplakken randen"),
        m("Afdekfolie", 0.2, "m²", "aanbevolen", "hulp", "Bescherming vloer/meubilair"),
    ]),
    ("Schilderwerken plafond", "Schilderwerken", "m²", "ceiling_area", 30, [
        m("Muurverf (eindlaag)", 0.27, "liter", reason="2 lagen plafond", waste=5, pkg=10, round_pkg=True),
        m("Primer/grondverf", 0.12, "liter", "aanbevolen", "hulp", "Egaliseren", pkg=10, round_pkg=True),
        m("Afdekfolie", 0.3, "m²", "aanbevolen", "hulp", "Bescherming"),
    ]),
    # ---------------- TEGELWERKEN ----------------
    ("Tegelvloer", "Tegelwerken", "m²", "floor_area", 8, [
        m("Vloertegels", 1.0, "m²", reason="Netto vloeroppervlak", waste=10, pkg=1.2, round_pkg=True),
        m("Tegellijm", 4.0, "kg", "verplicht", "hulp", "±4 kg/m² flexlijm", waste=5, pkg=25, round_pkg=True),
        m("Voegmiddel", 0.5, "kg", "verplicht", "hulp", "Voegen vloer", pkg=5, round_pkg=True),
        m("Tegelkruisjes/levelling clips", 12, "stuk", "aanbevolen", "hulp", "Egale legging grote tegels", pkg=250, round_pkg=True),
        m("Silicone", 0.05, "stuk", "verplicht", "hulp", "Dilatatievoegen/randen"),
        m("Ontkoppelingsmat", 1.0, "m²", "optioneel", "hulp", "Bij risico op scheurvorming", waste=10),
        m("Primer (tegelwerk)", 0.15, "liter", "optioneel", "hulp", "Bij zuigende chape"),
        m("Plinten", 0.0, "lm", "optioneel", "hulp", "Indien van toepassing"),
    ]),
    ("Wandtegels", "Tegelwerken", "m²", "wall_area_net", 7, [
        m("Wandtegels", 1.0, "m²", reason="Netto muuroppervlak", waste=10, pkg=1.0, round_pkg=True),
        m("Tegellijm", 3.5, "kg", "verplicht", "hulp", "Wandlijm", waste=5, pkg=25, round_pkg=True),
        m("Voegmiddel", 0.4, "kg", "verplicht", "hulp", "Voegen wand", pkg=5, round_pkg=True),
        m("Tegelprofiel", 0.15, "lm", "aanbevolen", "hulp", "Afwerking buitenhoeken/randen"),
        m("Silicone", 0.05, "stuk", "verplicht", "hulp", "Afdichting hoeken/aansluitingen"),
    ]),
    ("Douchezone waterdichting", "Tegelwerken", "m²", "manual", 6, [
        m("Waterdichtingsmembraan", 1.1, "m²", reason="Vereist volgens waterdichte opbouw natte zone", waste=10),
        m("Kimband", 1.0, "lm", "verplicht", "hulp", "Hoek- en vloer/wand-aansluiting natte zone"),
        m("Dichtingspasta/manchet", 0.2, "stuk", "verplicht", "hulp", "Doorvoeren leidingen waterdicht maken"),
        m("Primer (waterdichting)", 0.2, "liter", "aanbevolen", "hulp", "Hechting membraan"),
    ]),
    # ---------------- CHAPE ----------------
    ("Chape", "Chape", "m²", "floor_area", 60, [
        m("Chape (mortel)", 0.11, "m³", reason="±0.07-0.11 m³/m² afh. dikte", waste=5),
        m("Randisolatie", 0.4, "lm", "verplicht", "hulp", "Omtrek tegen geluidsbruggen"),
        m("PE-folie", 1.1, "m²", "verplicht", "hulp", "Scheidingslaag onder chape", waste=10),
        m("Wapeningsnet", 0.0, "m²", "optioneel", "hulp", "Indien van toepassing"),
        m("Vezels/cement", 0.0, "kg", "optioneel", "hulp", "Indien vezelversterkt"),
    ]),
    # ---------------- VLOERVERWARMING ----------------
    ("Vloerverwarming", "Vloerverwarming", "m²", "floor_area", 25, [
        m("Vloerverwarmingsbuis", 6.0, "lm", reason="±6 lm/m² bij 15cm tussenafstand", waste=5, pkg=240, round_pkg=True),
        m("Noppenplaat/tackerplaat", 1.05, "m²", "verplicht", "hulp", "Onderlaag + fixatie buis", waste=5),
        m("Tackers/clips", 6, "stuk", "verplicht", "hulp", "Fixatie buis", pkg=300, round_pkg=True),
        m("Randisolatie", 0.4, "lm", "verplicht", "hulp", "Omtrek"),
        m("Collector/verdeler", 0.02, "stuk", "verplicht", "basis", "Verdeling kringen per zone"),
        m("Koppelingen", 0.1, "stuk", "verplicht", "hulp", "Aansluiting buizen op collector"),
        m("Druktestmateriaal", 0.01, "stuk", "aanbevolen", "hulp", "Druktest voor ingieten"),
    ]),
    # ---------------- SANITAIR RUWBOUW ----------------
    ("Sanitair ruwbouw", "Sanitair ruwbouw", "m²", "manual", 4, [
        m("Meerlagenbuis", 2.5, "lm", reason="Aan- en afvoerleidingen", waste=10, pkg=50, round_pkg=True),
        m("Perskoppelingen", 1.2, "stuk", "verplicht", "hulp", "Verbindingen meerlagenbuis", pkg=25, round_pkg=True),
        m("Bochten/fittingen", 0.8, "stuk", "verplicht", "hulp", "Richtingsveranderingen"),
        m("Muurplaten", 0.3, "stuk", "verplicht", "hulp", "Aansluitpunten kranen aan wand"),
        m("Afvoerbuis PVC", 1.0, "lm", "verplicht", "basis", "Afvoer toestellen", waste=10),
        m("Sifon", 0.2, "stuk", "verplicht", "hulp", "Geurafsluiting per toestel"),
        m("Isolatiemantel", 1.0, "lm", "aanbevolen", "hulp", "Isolatie warmwaterleiding"),
        m("Beugels", 1.5, "stuk", "verplicht", "hulp", "Fixatie leidingen"),
        m("Montagekit", 0.05, "stuk", "verplicht", "hulp", "Diverse montage"),
    ]),
    # ---------------- ELEKTRICITEIT ----------------
    ("Elektriciteit basis", "Elektriciteit", "m²", "manual", 6, [
        m("Kabel XVB/installatiedraad", 3.0, "lm", reason="Bekabeling kringen", waste=10, pkg=100, round_pkg=True),
        m("Preflex (flexbuis)", 1.5, "lm", "verplicht", "hulp", "Mantelbuizen", waste=10, pkg=100, round_pkg=True),
        m("Inbouwdoos", 0.4, "stuk", "verplicht", "hulp", "Schakelaars/stopcontacten", pkg=50, round_pkg=True),
        m("Schakelaar", 0.1, "stuk", "verplicht", "basis", "Bediening verlichting"),
        m("Stopcontact", 0.25, "stuk", "verplicht", "basis", "Voedingspunten"),
        m("Afdekraam", 0.3, "stuk", "verplicht", "hulp", "Afwerking schakelmateriaal"),
        m("Automaat/zekering", 0.05, "stuk", "optioneel", "basis", "Indien opgenomen in offerte"),
        m("Verbindingsmateriaal (lasklemmen)", 0.5, "stuk", "verplicht", "hulp", "Verbindingen", pkg=100, round_pkg=True),
    ]),
    # ---------------- VENTILATIE ----------------
    ("Ventilatie basis", "Ventilatie", "m²", "floor_area", 30, [
        m("Ventilatiekanaal", 0.5, "lm", reason="Luchtkanalen", waste=10),
        m("Bocht (ventilatie)", 0.1, "stuk", "verplicht", "hulp", "Richtingsveranderingen"),
        m("Ventiel (toevoer/afvoer)", 0.06, "stuk", "verplicht", "basis", "Luchtdebiet per ruimte"),
        m("Dakdoorvoer/muurdoorvoer", 0.02, "stuk", "verplicht", "hulp", "Doorvoer naar buiten"),
        m("Aluminium tape", 0.3, "lm", "verplicht", "hulp", "Luchtdicht maken verbindingen"),
        m("Beugels (ventilatie)", 0.3, "stuk", "verplicht", "hulp", "Fixatie kanalen"),
        m("Regelklep", 0.02, "stuk", "aanbevolen", "hulp", "Debietregeling"),
    ]),
    # ---------------- EINDAFWERKING ----------------
    ("Afwerken dagkanten", "Eindafwerking", "lm", "dagkanten", 30, [
        m("Hoekprofiel", 1.0, "lm", "verplicht", "hulp", "Bescherming dagkant"),
        m("Pleister/plamuur", 0.3, "kg", "verplicht", "hulp", "Afwerking dagkant"),
        m("Schuurpapier", 0.1, "stuk", "aanbevolen", "hulp", "Glad afwerken"),
    ]),
]


# ---------------- SANITAIRE PLAATSINGS-WERKPOSTEN (per toestel) ----------------
# (naam, eenheid, productiviteit/mandag, [aansluitmateriaal])
SANITAIR_SEED = [
    ("Plaatsen lavabomeubel", "stuk", 6, [
        m("Aansluitmateriaal lavabo", 1.0, "stuk", "verplicht", "hulp", "Sifon + flexibels + bevestiging"),
        m("Montagekit/silicone", 1.0, "stuk", "verplicht", "hulp", "Afdichting tegen wand"),
    ]),
    ("Plaatsen wastafel/opzetkom", "stuk", 5, [
        m("Aansluitmateriaal wastafel", 1.0, "stuk", "verplicht", "hulp", "Sifon + bevestigingsset"),
        m("Silicone", 1.0, "stuk", "verplicht", "hulp", "Afdichting"),
    ]),
    ("Plaatsen spiegel/spiegelkast", "stuk", 8, [
        m("Bevestigingsset spiegel", 1.0, "stuk", "verplicht", "hulp", "Pluggen + schroeven"),
    ]),
    ("Plaatsen kolomkast", "stuk", 6, [
        m("Bevestigingsset kast", 1.0, "stuk", "verplicht", "hulp", "Wandbevestiging"),
    ]),
    ("Plaatsen lavabokraan", "stuk", 12, [
        m("Flexibels + aansluitstukken", 1.0, "stuk", "verplicht", "hulp", "Aansluiting warm/koud water"),
    ]),
    ("Plaatsen douchekraan", "stuk", 8, [
        m("Aansluitmateriaal douchekraan", 1.0, "stuk", "verplicht", "hulp", "Aansluitstukken + dichting"),
    ]),
    ("Plaatsen douchetube/showerpipe", "stuk", 6, [
        m("Bevestiging + aansluiting", 1.0, "stuk", "verplicht", "hulp", "Wandbevestiging + dichting"),
    ]),
    ("Plaatsen badkraan", "stuk", 8, [
        m("Aansluitmateriaal badkraan", 1.0, "stuk", "verplicht", "hulp", "Aansluitstukken"),
    ]),
    ("Plaatsen bad", "stuk", 3, [
        m("Badpoten + afvoergarnituur", 1.0, "stuk", "verplicht", "hulp", "Stelpoten + afvoer/overloop"),
        m("Montagekit/silicone", 2.0, "stuk", "verplicht", "hulp", "Afdichting randen"),
    ]),
    ("Plaatsen toilet", "stuk", 5, [
        m("Aansluitmateriaal toilet", 1.0, "stuk", "verplicht", "hulp", "Aansluitbocht + dichting"),
        m("Bevestigingsset toilet", 1.0, "stuk", "verplicht", "hulp", "Vloer-/wandbevestiging"),
    ]),
    ("Plaatsen inbouwreservoir", "stuk", 4, [
        m("Inbouwframe + bevestiging", 1.0, "stuk", "verplicht", "hulp", "Frame + wandfixatie"),
        m("Aansluitset reservoir", 1.0, "stuk", "verplicht", "hulp", "Watertoevoer + afvoerbocht"),
    ]),
    ("Plaatsen bedieningsplaat", "stuk", 16, [
        m("Bevestigingsset plaat", 1.0, "stuk", "verplicht", "hulp", "Montageframe bedieningsplaat"),
    ]),
    ("Plaatsen douchebak", "stuk", 4, [
        m("Afvoergarnituur douche", 1.0, "stuk", "verplicht", "hulp", "Sifon + rooster"),
        m("Montagekit/silicone", 2.0, "stuk", "verplicht", "hulp", "Afdichting"),
    ]),
    ("Plaatsen douchewand/deur", "stuk", 4, [
        m("Bevestigingsprofielen douchewand", 1.0, "stuk", "verplicht", "hulp", "Wandprofielen + schroeven"),
        m("Silicone", 1.0, "stuk", "verplicht", "hulp", "Waterdichte afkitting"),
    ]),
    ("Plaatsen nis", "stuk", 3, [
        m("Inbouwnis (kant-en-klaar)", 1.0, "stuk", "aanbevolen", "basis", "Waterdichte inbouwnis"),
        m("Waterdichtingsband", 2.0, "lm", "verplicht", "hulp", "Afdichting rondom nis"),
    ]),
    ("Plaatsen handdoekradiator", "stuk", 4, [
        m("Bevestigingsset radiator", 1.0, "stuk", "verplicht", "hulp", "Wandconsoles"),
        m("Aansluitkranen radiator", 1.0, "stuk", "verplicht", "hulp", "Aansluiting verwarming"),
    ]),
    ("Plaatsen uitgietbak", "stuk", 5, [
        m("Aansluitmateriaal uitgietbak", 1.0, "stuk", "verplicht", "hulp", "Sifon + kraan-aansluiting"),
    ]),
    ("Plaatsen wasmachinekraan + sifon", "stuk", 8, [
        m("Wasmachinekraan + sifonset", 1.0, "stuk", "verplicht", "hulp", "Kraan + machinesifon"),
    ]),
]


def _now():
    return datetime.now(timezone.utc).isoformat()


async def seed_material_profiles():
    """Seed standaard werkposten + materialen (idempotent: bestaande namen worden overgeslagen)."""
    from server import db
    import werkposten as wp_mod

    # Bestaande werkpost-namen (lowercase) — niet overschrijven
    existing_wp = set()
    async for w in db.work_items.find({}, {"_id": 0, "name": 1, "title": 1}):
        nm = (w.get("name") or w.get("title") or "").strip().lower()
        if nm:
            existing_wp.add(nm)
    existing_mat = set()
    async for mat in db.materiaal_items.find({}, {"_id": 0, "name": 1}):
        nm = (mat.get("name") or "").strip().lower()
        if nm:
            existing_mat.add(nm)

    wp_created, mat_created = 0, 0
    material_catalog = {}  # name_lower -> (name, unit, category)

    def collect_materials(profile, category):
        for mc in profile:
            key = mc["material_name"].strip().lower()
            if key not in material_catalog:
                material_catalog[key] = (mc["material_name"], mc["unit"], category)

    async def add_werkpost(name, category, unit, default_source, productivity, profile):
        nonlocal wp_created
        if name.strip().lower() in existing_wp:
            return
        obj = wp_mod.WorkItem(
            name=name,
            category=category,
            unit=unit,
            standard_price=None,
            vat_rate=6.0,
            discipline_order=wp_mod.DISCIPLINE_ORDER.get(category, 18),
            default_source=default_source,
            material_profile=[wp_mod.MaterialConsumption(**mc) for mc in profile],
            productivity_profile=wp_mod.ProductivityProfile(production_per_man_day=productivity, production_unit=unit) if productivity else None,
        )
        await db.work_items.insert_one(obj.model_dump())
        existing_wp.add(name.strip().lower())
        wp_created += 1

    # Standaard werkposten
    for (name, category, unit, default_source, productivity, profile) in WERKPOST_SEED:
        collect_materials(profile, category)
        await add_werkpost(name, category, unit, default_source, productivity, profile)

    # Sanitaire plaatsings-werkposten
    for (name, unit, productivity, profile) in SANITAIR_SEED:
        collect_materials(profile, "Sanitair afwerking")
        await add_werkpost(name, "Sanitair afwerking", unit, "manual", productivity, profile)

    # Materialen in de bibliotheek seeden (zonder prijs → zelflerend)
    from materiaal import MateriaalItem
    for key, (mname, munit, mcat) in material_catalog.items():
        if key in existing_mat:
            continue
        mat = MateriaalItem(name=mname, category=mcat, unit=munit, purchase_price=None)
        await db.materiaal_items.insert_one(mat.model_dump())
        existing_mat.add(key)
        mat_created += 1

    if wp_created or mat_created:
        logger.info(f"Seed material profiles: {wp_created} werkposten + {mat_created} materialen toegevoegd")
    return {"werkposten_created": wp_created, "materialen_created": mat_created}
