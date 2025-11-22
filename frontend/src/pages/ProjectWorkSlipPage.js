import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Plus, Loader2, Camera, ArrowLeft, Trash2, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';

// Hardcoded translations voor veelvoorkomende termen
const translations = {
  nl_to_uk: {
    // Materialen
    'cement': 'цемент',
    'beton': 'бетон',
    'stenen': 'цегла',
    'hout': 'деревина',
    'balken': 'балки',
    'planken': 'дошки',
    'gips': 'гіпс',
    'verf': 'фарба',
    'tegels': 'плитка',
    'isolatie': 'ізоляція',
    'dakpannen': 'черепиця',
    'ramen': 'вікна',
    'deuren': 'двері',
    'leidingen': 'труби',
    'kabels': 'кабелі',
    'schroeven': 'гвинти',
    'spijkers': 'цвяхи',
    'lijm': 'клей',
    'zand': 'пісок',
    'grind': 'гравій',
    
    // Werkzaamheden
    'muren': 'стіни',
    'vloer': 'підлога',
    'plafond': 'стеля',
    'dak': 'дах',
    'fundering': 'фундамент',
    'stucwerk': 'штукатурка',
    'schilderen': 'фарбування',
    'betegelen': 'укладання плитки',
    'elektra': 'електрика',
    'loodgieter': 'сантехніка',
    'installatie': 'встановлення',
    'renovatie': 'ремонт',
    'nieuwbouw': 'нове будівництво',
    'verbouwing': 'перебудова',
    'afwerking': 'оздоблення',
    'grondwerk': 'земельні роботи',
    'metselwerk': 'муровання',
    'timmerwerk': 'столярні роботи',
    'glaswerk': 'скляні роботи',
    
    // Algemene werkwoorden
    'geplaatst': 'встановлено',
    'verwijderd': 'видалено',
    'gerepareerd': 'відремонтовано',
    'geschilderd': 'пофарбовано',
    'gemaakt': 'зроблено',
    'afgewerkt': 'завершено',
    'geïnstalleerd': 'встановлено',
    'gelegd': 'покладено',
    'gebouwd': 'побудовано',
    'gegraven': 'викопано',
    'gegoten': 'залито',
    
    // Tijdsaanduiding
    'vandaag': 'сьогодні',
    'begonnen': 'почато',
    'voltooid': 'завершено',
    'bezig': 'в процесі',
    'klaar': 'готово',
    'morgen': 'завтра',
    'volgende week': 'наступного тижня',
    
    // Locaties
    'keuken': 'кухня',
    'badkamer': 'ванна кімната',
    'slaapkamer': 'спальня',
    'woonkamer': 'вітальня',
    'hal': 'коридор',
    'zolder': 'горище',
    'kelder': 'підвал',
    'garage': 'гараж',
    'tuin': 'сад',
    'terras': 'тераса'
  }
};

// Basis vertaalfunctie (simpel - vervangt bekende woorden)
const simpleTranslate = (text, fromLang = 'nl') => {
  if (!text || text.trim() === '') return '';
  
  let translated = text.toLowerCase();
  const dict = fromLang === 'nl' ? translations.nl_to_uk : {};
  
  // Vervang bekende woorden
  Object.keys(dict).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    translated = translated.replace(regex, dict[key]);
  });
  
  return translated.charAt(0).toUpperCase() + translated.slice(1);
};

export default function ProjectWorkSlipPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [quoteMaterials, setQuoteMaterials] = useState([]);
  const [workSlips, setWorkSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state voor nieuwe werkbon
  const [formData, setFormData] = useState({
    hours_worked: '',
    materials_used: [],
    extra_materials: [],
    work_description_nl: '',
    work_description_uk: '',
    photos: []
  });
  
  const [extraMaterialForm, setExtraMaterialForm] = useState({
    description_nl: '',
    description_uk: '',
    quantity: ''
  });
  
  const [photoFiles, setPhotoFiles] = useState([]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProject(),
        fetchQuoteMaterials(),
        fetchWorkSlips()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}`,
        { withCredentials: true }
      );
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      toast.error('Kon project niet laden');
    }
  };

  const fetchQuoteMaterials = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/quote-materials`,
        { withCredentials: true }
      );
      setQuoteMaterials(response.data || []);
    } catch (error) {
      console.error('Failed to fetch quote materials:', error);
    }
  };

  const fetchWorkSlips = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips`,
        { withCredentials: true }
      );
      setWorkSlips(response.data || []);
    } catch (error) {
      console.error('Failed to fetch work slips:', error);
    }
  };

  const handleMaterialToggle = (material) => {
    setFormData(prev => {
      const exists = prev.materials_used.find(m => m.material_id === material.id);
      if (exists) {
        return {
          ...prev,
          materials_used: prev.materials_used.filter(m => m.material_id !== material.id)
        };
      } else {
        return {
          ...prev,
          materials_used: [...prev.materials_used, {
            material_id: material.id,
            description_nl: material.description_nl,
            description_uk: material.description_uk,
            quantity_used: material.quantity_quoted
          }]
        };
      }
    });
  };

  const updateMaterialQuantity = (materialId, quantity) => {
    setFormData(prev => ({
      ...prev,
      materials_used: prev.materials_used.map(m => 
        m.material_id === materialId ? { ...m, quantity_used: parseFloat(quantity) || 0 } : m
      )
    }));
  };

  const addExtraMaterial = () => {
    if (!extraMaterialForm.description_nl.trim()) {
      toast.error('Vul minimaal een Nederlandse beschrijving in');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      extra_materials: [...prev.extra_materials, { ...extraMaterialForm }]
    }));
    
    setExtraMaterialForm({
      description_nl: '',
      description_uk: '',
      quantity: ''
    });
    
    toast.success('Extra materiaal toegevoegd');
  };

  const removeExtraMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      extra_materials: prev.extra_materials.filter((_, i) => i !== index)
    }));
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} foto(s) toegevoegd`);
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const translateNLtoUK = () => {
    if (formData.work_description_nl) {
      const translated = simpleTranslate(formData.work_description_nl, 'nl');
      setFormData(prev => ({ ...prev, work_description_uk: translated }));
      toast.info('Automatische vertaling toegevoegd - controleer en pas aan indien nodig');
    }
  };

  const handleSubmit = async () => {
    if (!formData.work_description_nl && !formData.work_description_uk) {
      toast.error('Vul minimaal één werkbeschrijving in (NL of UA)');
      return;
    }

    setIsCreating(true);
    
    try {
      // Create work slip
      const slipData = {
        project_id: projectId,
        materials_used: formData.materials_used,
        extra_materials: formData.extra_materials,
        work_description_nl: formData.work_description_nl,
        work_description_uk: formData.work_description_uk
      };
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips`,
        slipData,
        { withCredentials: true }
      );
      
      const slipId = response.data.id;
      
      // Upload photos
      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const formData = new FormData();
          formData.append('file', file);
          
          await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/api/projects/${projectId}/work-slips/${slipId}/photos`,
            formData,
            { 
              withCredentials: true,
              headers: { 'Content-Type': 'multipart/form-data' }
            }
          );
        }
      }
      
      toast.success('Werkbon succesvol opgeslagen! ✅');
      
      // Reset form
      setFormData({
        hours_worked: '',
        materials_used: [],
        extra_materials: [],
        work_description_nl: '',
        work_description_uk: '',
        photos: []
      });
      setPhotoFiles([]);
      
      // Refresh data
      await fetchWorkSlips();
      
      // Scroll naar boven om overzicht te tonen
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error('Failed to create work slip:', error);
      toast.error('Kon werkbon niet opslaan');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin" size={48} style={{ color: '#1E40AF' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header - Mobile First */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center"
          >
            <ArrowLeft size={20} className="mr-2" />
            Terug
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-2">
            <FileText size={24} style={{ color: '#1E40AF' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#1E3A8A' }}>
              Werkbon Registratie
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>
            {project?.name || 'Project'}
          </p>
          <div className="mt-3 flex items-center space-x-2 text-xs">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">🇳🇱 Nederlands</span>
            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">🇺🇦 Українська</span>
          </div>
        </div>

        {/* Recent Work Slips Timeline */}
        {workSlips.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-3" style={{ color: '#1E3A8A' }}>
              📅 Recente Werkbonnen / Останні робочі звіти
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {workSlips.slice(0, 5).map((slip) => (
                <div key={slip.id} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded">
                  <p className="text-xs font-semibold" style={{ color: '#64748B' }}>
                    {formatDate(slip.date)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#334155' }}>
                    🇳🇱 {slip.work_description_nl?.substring(0, 80) || '-'}
                    {slip.work_description_nl?.length > 80 && '...'}
                  </p>
                  {slip.photos && slip.photos.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                      📷 {slip.photos.length} foto(s)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 0: Gewerkte Uren */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E3A8A' }}>
            ⏱️ Gewerkte Uren / Відпрацьовані години
          </h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            Hoeveel uur heb je vandaag gewerkt? / Скільки годин ви сьогодні працювали?
          </p>
          
          <div className="max-w-md">
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={formData.hours_worked}
              onChange={(e) => setFormData({...formData, hours_worked: e.target.value})}
              placeholder="bijv. 8.5 / наприклад: 8.5"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#1E3A8A' }}
            />
            <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
              💡 Tip: Gebruik decimalen voor halve uren (8.5 = 8 uur en 30 minuten)
            </p>
          </div>
        </div>

        {/* SECTION 1: Materialen uit Offerte */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E3A8A' }}>
            1️⃣ Gebruikte Materialen uit Offerte / Матеріали з пропозиції
          </h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            Selecteer wat je vandaag hebt gebruikt (catalogus & handmatig ingevoerd)
          </p>
          
          {quoteMaterials.length === 0 ? (
            <p className="text-sm italic" style={{ color: '#94A3B8' }}>
              Geen materialen in offerte / Немає матеріалів у пропозиції
            </p>
          ) : (
            <div className="space-y-3">
              {quoteMaterials.map((material) => {
                const isSelected = formData.materials_used.find(m => m.material_id === material.id);
                
                return (
                  <div 
                    key={material.id}
                    className={`border-2 rounded-lg p-3 transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => handleMaterialToggle(material)}
                        className="mt-1 w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm" style={{ color: '#1E3A8A' }}>
                          🇳🇱 {material.description_nl}
                        </p>
                        <p className="text-sm" style={{ color: '#64748B' }}>
                          🇺🇦 {material.description_uk}
                        </p>
                        {material.quantity_quoted > 0 && (
                          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                            Offerte hoeveelheid: {material.quantity_quoted} {material.unit}
                          </p>
                        )}
                      </div>
                    </label>
                    
                    {isSelected && (
                      <div className="mt-2 ml-8">
                        <label className="text-xs font-medium" style={{ color: '#64748B' }}>
                          Gebruikt vandaag / Використано сьогодні:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={isSelected.quantity_used || ''}
                          onChange={(e) => updateMaterialQuantity(material.id, e.target.value)}
                          placeholder={material.quantity_quoted > 0 ? `${material.quantity_quoted}` : "0"}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Extra Materialen */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E3A8A' }}>
            2️⃣ Extra Materialen / Додаткові матеріали
          </h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            Materialen die niet in de offerte staan
          </p>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                🇳🇱 Beschrijving Nederlands
              </label>
              <input
                type="text"
                value={extraMaterialForm.description_nl}
                onChange={(e) => setExtraMaterialForm({...extraMaterialForm, description_nl: e.target.value})}
                placeholder="bijv. Extra cement zakken"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                🇺🇦 Опис Українською
              </label>
              <input
                type="text"
                value={extraMaterialForm.description_uk}
                onChange={(e) => setExtraMaterialForm({...extraMaterialForm, description_uk: e.target.value})}
                placeholder="наприклад: Додаткові мішки цементу"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Hoeveelheid / Кількість
              </label>
              <input
                type="text"
                value={extraMaterialForm.quantity}
                onChange={(e) => setExtraMaterialForm({...extraMaterialForm, quantity: e.target.value})}
                placeholder="bijv. 5 zakken / наприклад: 5 мішків"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            <Button 
              onClick={addExtraMaterial}
              variant="outline"
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Toevoegen / Додати
            </Button>
          </div>
          
          {formData.extra_materials.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: '#64748B' }}>
                Toegevoegde extra materialen:
              </p>
              {formData.extra_materials.map((mat, idx) => (
                <div key={idx} className="flex items-start justify-between bg-gray-50 p-2 rounded">
                  <div className="flex-1">
                    <p className="text-sm">🇳🇱 {mat.description_nl}</p>
                    <p className="text-sm">🇺🇦 {mat.description_uk}</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>Aantal: {mat.quantity}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExtraMaterial(idx)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: Werkbeschrijving */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E3A8A' }}>
            3️⃣ Werkbeschrijving / Опис робіт
          </h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            Wat heb je vandaag gedaan?
          </p>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  🇳🇱 Nederlands
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={translateNLtoUK}
                  disabled={!formData.work_description_nl}
                >
                  <Languages size={16} className="mr-1" />
                  Vertaal →
                </Button>
              </div>
              <Textarea
                value={formData.work_description_nl}
                onChange={(e) => setFormData({...formData, work_description_nl: e.target.value})}
                rows={5}
                placeholder="Beschrijf de werkzaamheden van vandaag in het Nederlands..."
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                🇺🇦 Українська
              </label>
              <Textarea
                value={formData.work_description_uk}
                onChange={(e) => setFormData({...formData, work_description_uk: e.target.value})}
                rows={5}
                placeholder="Опишіть роботи, виконані сьогодні українською мовою..."
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
                💡 Tip: Gebruik de vertaalknop of typ handmatig in beide talen
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Foto's */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E3A8A' }}>
            4️⃣ Foto's van de Werkplek / Фото з робочого місця
          </h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            Upload foto's van het uitgevoerde werk
          </p>
          
          <label className="block">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <Button variant="outline" className="w-full" asChild>
              <span>
                <Camera size={20} className="mr-2" />
                Foto's Selecteren / Вибрати фото
              </span>
            </Button>
          </label>
          
          {photoFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium" style={{ color: '#64748B' }}>
                {photoFiles.length} foto('s) geselecteerd:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {photoFiles.map((file, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-4 bg-white rounded-xl shadow-lg border-2 border-blue-500 p-4">
          <Button
            onClick={handleSubmit}
            disabled={isCreating}
            className="w-full text-lg py-6"
            style={{ backgroundColor: '#1E40AF' }}
          >
            {isCreating ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Opslaan...
              </>
            ) : (
              <>
                ✅ Werkbon Opslaan / Зберегти звіт
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
