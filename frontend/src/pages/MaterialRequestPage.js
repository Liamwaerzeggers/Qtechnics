import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, Send, Check, Clock, Truck, Loader2, Plus, Minus, ShoppingCart, Image as ImageIcon, MapPin, Search, FolderOpen, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Bilingual helper
const T = {
  pageTitle: { nl: "Materiaal Bestellen", ua: "Замовити матеріали" },
  pageSubtitle: { nl: "Kies materialen uit de catalogus en bestel ze voor je werf", ua: "Оберіть матеріали з каталогу та замовте їх для вашого будівництва" },
  catalog: { nl: "Catalogus", ua: "Каталог" },
  myOrders: { nl: "Mijn Bestellingen", ua: "Мої Замовлення" },
  selectProject: { nl: "Kies werf / project", ua: "Оберіть будмайданчик / проект" },
  quantity: { nl: "Aantal", ua: "Кількість" },
  size: { nl: "Afmeting", ua: "Розмір" },
  chooseSize: { nl: "Kies afmeting", ua: "Оберіть розмір" },
  addToCart: { nl: "Toevoegen", ua: "Додати" },
  cart: { nl: "Bestelling", ua: "Замовлення" },
  emptyCart: { nl: "Nog geen materialen gekozen", ua: "Матеріали ще не обрані" },
  notes: { nl: "Extra notities (optioneel)", ua: "Додаткові примітки (необов'язково)" },
  send: { nl: "Bestelling Versturen", ua: "Надіслати замовлення" },
  sending: { nl: "Versturen...", ua: "Надсилання..." },
  success: { nl: "Bestelling verstuurd!", ua: "Замовлення надіслано!" },
  error: { nl: "Kon niet versturen", ua: "Не вдалося надіслати" },
  noProject: { nl: "Kies eerst een werf", ua: "Спочатку оберіть будмайданчик" },
  status: {
    pending: { nl: "Wacht op bestelling", ua: "Очікує замовлення" },
    ordered: { nl: "Besteld", ua: "Замовлено" },
    delivered: { nl: "Geleverd", ua: "Доставлено" }
  },
  noOrders: { nl: "Je hebt nog geen bestellingen", ua: "У вас ще немає замовлень" },
  searchPlaceholder: { nl: "Zoek materialen...", ua: "Пошук матеріалів..." },
  emptyCatalog: { nl: "Geen materialen beschikbaar", ua: "Немає доступних матеріалів" },
  remove: { nl: "Verwijderen", ua: "Видалити" },
  deliverTo: { nl: "Leveren op", ua: "Доставити на" },
  deliveryDate: { nl: "Gewenste leverdatum", ua: "Бажана дата доставки" },
  asap: { nl: "Zo snel mogelijk", ua: "Якнайшвидше" }
};

export default function MaterialRequestPage() {
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('catalog');
  const [collapsedCats, setCollapsedCats] = useState({});

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/material-catalog`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      axios.get(`${API}/material-categories`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      axios.get(`${API}/material-requests`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      axios.get(`${API}/projects`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
    ]).then(([catItemRes, catRes, reqRes, projRes]) => {
      setCatalog(catItemRes.data || []);
      setCategories(catRes.data || []);
      setRequests(reqRes.data || []);
      setProjects(projRes.data || []);
      setLoading(false);
    });
  }, []);

  const filteredCatalog = catalog.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item, size = null) => {
    const existingIdx = cart.findIndex(c => c.catalog_item_id === item.id && c.selected_size === size);
    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        catalog_item_id: item.id,
        title: item.title,
        title_ua: item.title_ua || null,
        image_url: item.image_url,
        selected_size: size,
        quantity: 1,
        sizes: item.sizes || []
      }]);
    }
    toast.success(`${isWorker ? '✅ Toegevoegd / Додано' : '✅ Toegevoegd'}`);
  };

  const updateCartQty = (idx, delta) => {
    const updated = [...cart];
    updated[idx].quantity = Math.max(1, updated[idx].quantity + delta);
    setCart(updated);
  };

  const updateCartSize = (idx, size) => {
    const updated = [...cart];
    updated[idx].selected_size = size;
    setCart(updated);
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      toast.error(isWorker ? `${T.noProject.nl} / ${T.noProject.ua}` : T.noProject.nl);
      return;
    }
    if (cart.length === 0) {
      toast.error(isWorker ? `${T.emptyCart.nl} / ${T.emptyCart.ua}` : T.emptyCart.nl);
      return;
    }
    // Check items with sizes have a size selected
    const missingSizes = cart.filter(c => c.sizes.length > 0 && !c.selected_size);
    if (missingSizes.length > 0) {
      toast.error(isWorker ? 'Kies een afmeting voor alle items / Оберіть розмір для всіх товарів' : 'Kies een afmeting voor alle items');
      return;
    }
    setSubmitting(true);
    const project = projects.find(p => p.id === selectedProject);
    try {
      await axios.post(`${API}/material-orders`, {
        items: cart.map(c => ({
          catalog_item_id: c.catalog_item_id,
          title: c.title,
          selected_size: c.selected_size,
          quantity: c.quantity,
          image_url: c.image_url
        })),
        project_id: selectedProject,
        project_name: project?.name || '',
        notes: notes || null,
        delivery_date: deliveryDate || null
      }, { headers: getAuthHeaders() });
      toast.success(isWorker ? `✅ ${T.success.nl} / ${T.success.ua}` : `✅ ${T.success.nl}`);
      setCart([]);
      setNotes('');
      setDeliveryDate('');
      // Refresh requests
      const reqRes = await axios.get(`${API}/material-requests`, { headers: getAuthHeaders() });
      setRequests(reqRes.data || []);
      setActiveTab('orders');
    } catch (err) {
      toast.error(isWorker ? `${T.error.nl} / ${T.error.ua}` : T.error.nl);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (request) => {
    if (request.is_delivered) {
      return (
        <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
          <Truck size={14} />
          {isWorker ? `${T.status.delivered.nl} / ${T.status.delivered.ua}` : T.status.delivered.nl}
        </span>
      );
    }
    if (request.is_ordered) {
      return (
        <span className="flex items-center gap-1 text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full text-xs font-medium">
          <Check size={14} />
          {isWorker ? `${T.status.ordered.nl} / ${T.status.ordered.ua}` : T.status.ordered.nl}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded-full text-xs font-medium">
        <Clock size={14} />
        {isWorker ? `${T.status.pending.nl} / ${T.status.pending.ua}` : T.status.pending.nl}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: '#500000' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5">
        {/* Header - compact on mobile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-2 sm:p-3 rounded-xl shrink-0" style={{ backgroundColor: '#f5e6e6' }}>
            <Package size={22} style={{ color: '#500000' }} className="sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#500000' }}>
              {T.pageTitle.nl}
              {isWorker && <span className="text-sm sm:text-base font-normal text-gray-400 ml-1">/ {T.pageTitle.ua}</span>}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
              {T.pageSubtitle.nl}
              {isWorker && <span className="text-gray-400 ml-1">/ {T.pageSubtitle.ua}</span>}
            </p>
          </div>
        </div>

        {/* Tabs - wrap on mobile */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            data-testid="tab-catalog"
            variant={activeTab === 'catalog' ? 'default' : 'outline'}
            onClick={() => setActiveTab('catalog')}
            style={activeTab === 'catalog' ? { backgroundColor: '#500000' } : {}}
            className="gap-1.5 text-xs sm:text-sm px-3 sm:px-4"
            size="sm"
          >
            <Package size={14} />
            {isWorker ? <><span>{T.catalog.nl}</span><span className="text-[10px] opacity-70">/ {T.catalog.ua}</span></> : T.catalog.nl}
          </Button>
          <Button
            data-testid="tab-orders"
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveTab('orders')}
            style={activeTab === 'orders' ? { backgroundColor: '#500000' } : {}}
            className="gap-1.5 text-xs sm:text-sm px-3 sm:px-4"
            size="sm"
          >
            <Clock size={14} />
            {isWorker ? <><span>{T.myOrders.nl}</span><span className="text-[10px] opacity-70">/ {T.myOrders.ua}</span></> : T.myOrders.nl}
            {requests.length > 0 && (
              <span className="bg-white/20 text-xs px-1.5 rounded-full">{requests.length}</span>
            )}
          </Button>
          {cart.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
              <ShoppingCart size={14} style={{ color: '#500000' }} />
              <span className="font-bold text-xs sm:text-sm" style={{ color: '#500000' }}>{cart.reduce((s, c) => s + c.quantity, 0)}</span>
            </div>
          )}
        </div>

        {activeTab === 'catalog' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Catalog Browse */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  data-testid="catalog-search"
                  className="pl-10"
                  placeholder={isWorker ? `${T.searchPlaceholder.nl} / ${T.searchPlaceholder.ua}` : T.searchPlaceholder.nl}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Catalog Grid - Grouped by Category */}
              {(() => {
                const catMap = {};
                categories.forEach(c => { catMap[c.id] = c; });
                const grouped = {};
                categories.forEach(c => { grouped[c.id] = []; });
                const uncategorized = [];
                filteredCatalog.forEach(item => {
                  if (item.category_id && catMap[item.category_id]) {
                    grouped[item.category_id].push(item);
                  } else {
                    uncategorized.push(item);
                  }
                });
                const hasCategories = categories.length > 0;
                const hasResults = filteredCatalog.length > 0;

                if (!hasResults) {
                  return (
                    <Card>
                      <CardContent className="text-center py-12 text-gray-500">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p>{isWorker ? `${T.emptyCatalog.nl} / ${T.emptyCatalog.ua}` : T.emptyCatalog.nl}</p>
                      </CardContent>
                    </Card>
                  );
                }

                if (!hasCategories) {
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredCatalog.map((item) => (
                        <CatalogCard key={item.id} item={item} isWorker={isWorker} onAdd={addToCart} inCart={cart.some(c => c.catalog_item_id === item.id)} />
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {categories.map(cat => {
                      const catItems = grouped[cat.id] || [];
                      if (catItems.length === 0) return null;
                      const isCollapsed = collapsedCats[cat.id];
                      return (
                        <div key={cat.id}>
                          <button
                            onClick={() => setCollapsedCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                            className="flex items-center gap-1.5 sm:gap-2 mb-2 w-full text-left group"
                          >
                            {isCollapsed ? <ChevronRight size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                            <FolderOpen size={15} style={{ color: '#500000' }} className="shrink-0" />
                            <h3 className="font-bold text-sm" style={{ color: '#500000' }}>
                              {cat.name}
                              {isWorker && cat.name_ua && <span className="text-gray-400 font-normal ml-1 text-xs">/ {cat.name_ua}</span>}
                            </h3>
                            <span className="text-xs text-gray-400">({catItems.length})</span>
                          </button>
                          {!isCollapsed && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                              {catItems.map((item) => (
                                <CatalogCard key={item.id} item={item} isWorker={isWorker} onAdd={addToCart} inCart={cart.some(c => c.catalog_item_id === item.id)} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {uncategorized.length > 0 && (
                      <div>
                        <button
                          onClick={() => setCollapsedCats(prev => ({ ...prev, '__uncategorized': !prev['__uncategorized'] }))}
                          className="flex items-center gap-1.5 sm:gap-2 mb-2 w-full text-left"
                        >
                          {collapsedCats['__uncategorized'] ? <ChevronRight size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                          <Package size={15} className="text-gray-400 shrink-0" />
                          <h3 className="font-bold text-sm text-gray-500">{isWorker ? 'Overige / Інше' : 'Overige'}</h3>
                        </button>
                        {!collapsedCats['__uncategorized'] && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {uncategorized.map((item) => (
                              <CatalogCard key={item.id} item={item} isWorker={isWorker} onAdd={addToCart} inCart={cart.some(c => c.catalog_item_id === item.id)} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Cart / Order Summary */}
            <div className="space-y-4">
              <Card className="sticky top-4" style={{ borderColor: '#7a1f1f', borderWidth: cart.length > 0 ? 2 : 1 }}>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2" style={{ color: '#500000' }}>
                    <ShoppingCart size={16} />
                    <span>{T.cart.nl}</span>
                    {isWorker && <span className="text-xs text-gray-400 font-normal">/ {T.cart.ua}</span>}
                    {cart.length > 0 && (
                      <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {cart.reduce((s, c) => s + c.quantity, 0)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cart.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">
                      {isWorker ? `${T.emptyCart.nl} / ${T.emptyCart.ua}` : T.emptyCart.nl}
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <ImageIcon size={16} className="text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{item.title}</p>
                              {isWorker && item.title_ua && <p className="text-[10px] text-gray-400 truncate">{item.title_ua}</p>}
                              {item.sizes.length > 0 && (
                                <select
                                  data-testid={`cart-size-${idx}`}
                                  className="text-xs border rounded px-1 py-0.5 mt-0.5 w-full"
                                  value={item.selected_size || ''}
                                  onChange={(e) => updateCartSize(idx, e.target.value)}
                                >
                                  <option value="">{isWorker ? `${T.chooseSize.nl}...` : 'Kies afmeting...'}</option>
                                  {item.sizes.map((s, i) => (
                                    <option key={i} value={s}>{s}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                data-testid={`cart-minus-${idx}`}
                                onClick={() => updateCartQty(idx, -1)}
                                className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                              <button
                                data-testid={`cart-plus-${idx}`}
                                onClick={() => updateCartQty(idx, 1)}
                                className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              data-testid={`cart-remove-${idx}`}
                              onClick={() => removeFromCart(idx)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Project selection */}
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{T.deliverTo.nl}</span>
                          {isWorker && <span className="text-[10px] text-gray-400 font-normal">/ {T.deliverTo.ua}</span>}
                        </Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger data-testid="order-project-select" className="mt-1">
                            <SelectValue placeholder={isWorker ? `${T.selectProject.nl} / ${T.selectProject.ua}` : T.selectProject.nl} />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} {p.lead_address ? `- ${p.lead_address}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delivery date */}
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <CalendarDays size={12} />
                          <span>{T.deliveryDate.nl}</span>
                          {isWorker && <span className="text-[10px] text-gray-400 font-normal">/ {T.deliveryDate.ua}</span>}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <input
                            data-testid="delivery-date-input"
                            type="date"
                            value={deliveryDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-white"
                          />
                          <Button
                            variant={!deliveryDate ? 'default' : 'outline'}
                            size="sm"
                            className="text-[10px] sm:text-xs shrink-0 h-8"
                            style={!deliveryDate ? { backgroundColor: '#500000' } : {}}
                            onClick={() => setDeliveryDate('')}
                          >
                            {isWorker ? `${T.asap.nl}` : T.asap.nl}
                          </Button>
                        </div>
                      </div>

                      {/* Notes */}
                      <Textarea
                        data-testid="order-notes"
                        placeholder={isWorker ? `${T.notes.nl} / ${T.notes.ua}` : T.notes.nl}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />

                      {/* Submit */}
                      <Button
                        data-testid="submit-order-btn"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full"
                        style={{ backgroundColor: '#500000' }}
                      >
                        {submitting ? (
                          <><Loader2 size={16} className="mr-2 animate-spin" /> {isWorker ? `${T.sending.nl} / ${T.sending.ua}` : T.sending.nl}</>
                        ) : (
                          <><Send size={16} className="mr-2" /> {isWorker ? `${T.send.nl} / ${T.send.ua}` : T.send.nl}</>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Orders Tab */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col">
                <span>{T.myOrders.nl}</span>
                {isWorker && <span className="text-gray-500 text-sm font-normal">{T.myOrders.ua}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-3 opacity-50" />
                  <p>{isWorker ? `${T.noOrders.nl} / ${T.noOrders.ua}` : T.noOrders.nl}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      data-testid={`order-${req.id}`}
                      className={`p-3 rounded-lg border-2 ${
                        req.is_delivered ? 'bg-green-50 border-green-200' :
                        req.is_ordered ? 'bg-yellow-50 border-yellow-200' :
                        'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {req.photo_url ? (
                          <img src={req.photo_url} alt={req.title} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Package size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{req.title}</h4>
                          <p className="text-xs text-gray-600">{isWorker ? `${T.quantity.nl} / ${T.quantity.ua}` : T.quantity.nl}: {req.quantity}</p>
                          {req.project_name && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {req.project_name}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(req)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function CatalogCard({ item, isWorker, onAdd, inCart }) {
  const hasSizes = item.sizes && item.sizes.length > 0;
  const [selectedSize, setSelectedSize] = useState(hasSizes ? '' : null);
  const [showSizes, setShowSizes] = useState(false);

  const handleAdd = () => {
    if (hasSizes && !selectedSize) {
      setShowSizes(true);
      return;
    }
    onAdd(item, selectedSize);
  };

  return (
    <Card
      data-testid={`catalog-card-${item.id}`}
      className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer group ${inCart ? 'ring-2' : ''}`}
      style={inCart ? { ringColor: '#500000' } : {}}
    >
      {/* Image */}
      <div className="aspect-[4/3] sm:aspect-square bg-gray-100 relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <ImageIcon size={36} />
          </div>
        )}
        {inCart && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <Check size={14} />
          </div>
        )}
      </div>
      {/* Details */}
      <CardContent className="p-2 sm:p-3">
        <h3 className="font-bold text-xs sm:text-sm leading-tight" style={{ color: '#500000' }}>{item.title}</h3>
        {isWorker && item.title_ua && <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">{item.title_ua}</p>}
        {item.description && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-1 sm:line-clamp-2">{item.description}</p>}
        
        {/* Size selector (shown when needed) */}
        {hasSizes && showSizes && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-gray-600 mb-1">
              {isWorker ? `${T.chooseSize.nl} / ${T.chooseSize.ua}` : T.chooseSize.nl}:
            </p>
            <div className="flex flex-wrap gap-1">
              {item.sizes.map((s, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(s); }}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    selectedSize === s
                      ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasSizes && !showSizes && item.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.sizes.slice(0, 3).map((s, i) => (
              <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{s}</span>
            ))}
            {item.sizes.length > 3 && <span className="text-xs text-gray-400">+{item.sizes.length - 3}</span>}
          </div>
        )}

        <Button
          data-testid={`add-to-cart-${item.id}`}
          onClick={(e) => { e.stopPropagation(); handleAdd(); }}
          size="sm"
          className="w-full mt-2 text-[10px] sm:text-xs h-7 sm:h-8"
          style={{ backgroundColor: '#500000' }}
        >
          <Plus size={12} className="mr-0.5 sm:mr-1" />
          {isWorker ? <><span>{T.addToCart.nl}</span><span className="hidden sm:inline ml-0.5">/ {T.addToCart.ua}</span></> : T.addToCart.nl}
        </Button>
      </CardContent>
    </Card>
  );
}
