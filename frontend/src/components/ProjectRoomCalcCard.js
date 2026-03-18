import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const COLORS = {
  vloer: '#3b82f6', muur: '#22c55e', plafond: '#a855f7',
  elektriciteit: '#f97316', sanitair: '#06b6d4', overig: '#6b7280'
};

function ExtrasSection({ items, label, accentColor, onToggle }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;
  const selectedCount = items.filter(i => i.included).length;
  
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded-md w-full hover:bg-gray-50 transition-colors" style={{ color: accentColor }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Extra opties ({items.length})
        {selectedCount > 0 && <span className="ml-auto text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{selectedCount} geselecteerd</span>}
      </button>
      {open && (
        <div className="ml-2 mt-1 space-y-1 border-l-2 border-dashed pl-3" style={{ borderColor: accentColor + '40' }}>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-4 h-4" style={{ accentColor }} />
                <span className={`text-sm ${!item.included ? 'text-gray-500' : ''}`}>{item.title.replace(/^Extra:\s*/, '')}</span>
                <span className="text-xs text-gray-400">({item.quantity} {item.unit} x €{item.unit_price})</span>
              </div>
              <span className={`text-sm font-medium ${!item.included ? 'text-gray-400' : ''}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectRoomCalcCard({ roomCalc, projectId, onToggle, onSwitchFloor, onSwitchWall }) {
  const [expanded, setExpanded] = useState(false);

  const allItems = [...roomCalc.floor_items, ...roomCalc.wall_items, ...roomCalc.ceiling_items, ...roomCalc.other_items];
  const includedTotal = allItems.filter(i => i.included).reduce((sum, i) => sum + i.total, 0);

  const floorBaseItems = roomCalc.floor_items.filter(i => i.option_group === 'vloer_basis');
  const floorOptions = roomCalc.floor_items.filter(i => i.option_group === 'vloer_afwerking_keuze');
  const floorExtras = roomCalc.floor_items.filter(i => i.category === 'vloer_extra');

  const wallScenarioA = roomCalc.wall_items.filter(i => i.category === 'muur_scenario_a');
  const wallScenarioB = roomCalc.wall_items.filter(i => i.category === 'muur_scenario_b');
  const wallScenarioC = roomCalc.wall_items.filter(i => i.category === 'muur_scenario_c');
  const wallPainting = roomCalc.wall_items.filter(i => i.category === 'muur_afwerking');
  const wallExtras = roomCalc.wall_items.filter(i => i.category === 'muur_extra');

  const ceilingBase = roomCalc.ceiling_items.filter(i => !i.category?.includes('extra'));
  const ceilingExtras = roomCalc.ceiling_items.filter(i => i.category === 'plafond_extra');

  const elektriciteit = roomCalc.other_items.filter(i => i.category === 'elektriciteit');
  const elektriciteitExtras = roomCalc.other_items.filter(i => i.category === 'elektriciteit_extra');
  const sanitairExtras = roomCalc.other_items.filter(i => i.category === 'sanitair_extra');
  const overigExtras = roomCalc.other_items.filter(i => i.category === 'overig_extra');

  const currentWallScenario = wallScenarioA.some(i => i.included) ? 'nieuw_pleisterwerk' :
                             wallScenarioB.some(i => i.included) ? 'egaliseren' :
                             wallScenarioC.some(i => i.included) ? 'gyproc' : 'nieuw_pleisterwerk';

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={`project-room-calc-${roomCalc.room_id}`}>
      <button className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span className="font-medium">{roomCalc.room_name}</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{roomCalc.floor_area}m²</span>
        </div>
        <span className="font-semibold text-lg" style={{color: '#500000'}}>€{includedTotal.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-6">
          {/* VLOER */}
          <div className="border-l-4 border-blue-500 pl-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-700">Vloerwerken</h4>
              <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">{roomCalc.floor_area} m²</span>
            </div>
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Voorbereiding</p>
              {floorBaseItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-4 h-4 accent-blue-500" />
                    <span className={`text-sm ${!item.included && 'line-through text-gray-400'}`}>{item.title}</span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included && 'line-through text-gray-400'}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-2">Kies vloer afwerking</p>
              <div className="space-y-2">
                {floorOptions.map(item => (
                  <div key={item.id} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${item.included ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border border-gray-200 hover:border-blue-300'}`}
                    onClick={() => !item.included && onSwitchFloor(roomCalc.room_id, item.id)}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name={`pfloor-${roomCalc.room_id}`} checked={item.included} onChange={() => onSwitchFloor(roomCalc.room_id, item.id)} className="w-4 h-4 accent-blue-500" />
                      <span className={`text-sm ${item.included ? 'font-medium' : ''}`}>{item.title}</span>
                      <span className="text-xs text-gray-500">({item.quantity}m² x €{item.unit_price})</span>
                    </div>
                    <span className={`font-medium ${item.included ? 'text-blue-700' : 'text-gray-500'}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
                  </div>
                ))}
              </div>
            </div>
            <ExtrasSection items={floorExtras} label="vloer" accentColor={COLORS.vloer} onToggle={onToggle} />
          </div>

          {/* MUREN */}
          <div className="border-l-4 border-green-500 pl-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-green-700">Muurwerken</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium bg-green-100 text-green-700 px-2 py-1 rounded">{roomCalc.wall_area} m²</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">hoogte: {roomCalc.room_height}m</span>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-green-600 uppercase tracking-wide mb-2">Kies muur scenario</p>
              <div className="flex flex-wrap gap-2">
                {[{ key: 'nieuw_pleisterwerk', label: 'Nieuw pleisterwerk' }, { key: 'egaliseren', label: 'Egaliseren' }, { key: 'gyproc', label: 'Gyproc afwerking' }].map(s => (
                  <button key={s.key} onClick={() => onSwitchWall(roomCalc.room_id, s.key)} className={`px-3 py-2 rounded text-sm transition-all ${currentWallScenario === s.key ? 'bg-green-500 text-white' : 'bg-white border border-green-300 text-green-700 hover:bg-green-100'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1 mb-3">
              {[...wallScenarioA, ...wallScenarioB, ...wallScenarioC].filter(i => i.included).map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-sm">{item.title}</span>
                  <span className="text-sm font-medium">€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
            {wallPainting.map(item => (
              <div key={item.id} className={`flex items-center justify-between p-2 rounded ${item.included ? 'bg-yellow-50 border border-yellow-300' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-5 h-5 accent-yellow-500" />
                  <span className={`text-sm ${!item.included && 'line-through text-gray-400'}`}>Schilderwerk muren</span>
                  <span className="text-xs text-yellow-600 ml-2">(vaak zelf te doen)</span>
                </div>
                <span className={`font-medium ${!item.included && 'text-gray-400'}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
              </div>
            ))}
            <ExtrasSection items={wallExtras} label="muur" accentColor={COLORS.muur} onToggle={onToggle} />
          </div>

          {/* PLAFOND */}
          <div className="border-l-4 border-purple-500 pl-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-purple-700">Plafondwerken</h4>
              <span className="text-sm font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded">{roomCalc.ceiling_area} m²</span>
            </div>
            {ceilingBase.map(item => (
              <div key={item.id} className={`flex items-center justify-between py-1 ${item.category === 'plafond_afwerking' ? 'bg-yellow-50 p-2 rounded border border-yellow-300 my-2' : ''}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-4 h-4 accent-purple-500" />
                  <span className={`text-sm ${!item.included && 'line-through text-gray-400'}`}>
                    {item.title}
                    {item.category === 'plafond_afwerking' && <span className="text-xs text-yellow-600 ml-2">(vaak zelf te doen)</span>}
                  </span>
                </div>
                <span className={`text-sm font-medium ${!item.included && 'line-through text-gray-400'}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
              </div>
            ))}
            <ExtrasSection items={ceilingExtras} label="plafond" accentColor={COLORS.plafond} onToggle={onToggle} />
          </div>

          {/* ELEKTRICITEIT */}
          {(elektriciteit.length > 0 || elektriciteitExtras.length > 0) && (
            <div className="border-l-4 border-orange-500 pl-3">
              <h4 className="font-semibold text-orange-700 mb-3">Elektriciteit</h4>
              {elektriciteit.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-4 h-4 accent-orange-500" />
                    <span className={`text-sm ${!item.included ? 'line-through text-gray-400' : ''}`}>{item.title}</span>
                    <span className="text-xs text-gray-500">({item.quantity} {item.unit} x €{item.unit_price})</span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included ? 'line-through text-gray-400' : ''}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
                </div>
              ))}
              <ExtrasSection items={elektriciteitExtras} label="elektriciteit" accentColor={COLORS.elektriciteit} onToggle={onToggle} />
            </div>
          )}

          {/* SANITAIR */}
          {sanitairExtras.length > 0 && (
            <div className="border-l-4 border-cyan-500 pl-3">
              <h4 className="font-semibold text-cyan-700 mb-3">Sanitair</h4>
              {sanitairExtras.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-4 h-4 accent-cyan-500" />
                    <span className={`text-sm ${!item.included ? 'text-gray-500' : ''}`}>{item.title.replace(/^Extra:\s*/, '')}</span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included ? 'text-gray-400' : ''}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
          )}

          {/* OVERIG */}
          {overigExtras.length > 0 && (
            <div className="border-l-4 border-gray-400 pl-3">
              <h4 className="font-semibold text-gray-600 mb-3">Overig</h4>
              {overigExtras.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.included} onChange={() => onToggle(item.id, item.included)} className="w-4 h-4 accent-gray-500" />
                    <span className={`text-sm ${!item.included ? 'text-gray-500' : ''}`}>{item.title.replace(/^Extra:\s*/, '')}</span>
                  </div>
                  <span className={`text-sm font-medium ${!item.included ? 'text-gray-400' : ''}`}>€{item.total.toLocaleString('nl-BE', {minimumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
