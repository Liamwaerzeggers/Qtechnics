import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FinancesPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedView, setSelectedView] = useState('month'); // month, quarter, year

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`, { withCredentials: true });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get available years from projects
  const getAvailableYears = () => {
    const years = new Set();
    projects.forEach(project => {
      if (project.created_at) {
        const year = new Date(project.created_at).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Calculate financials by month
  const getMonthlyData = () => {
    const monthlyData = {};
    const months = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
    
    // Initialize all months
    months.forEach((month, index) => {
      monthlyData[index] = {
        month,
        revenue: 0,
        costs: 0,
        profit: 0,
        projects: 0
      };
    });

    // Aggregate data
    projects.forEach(project => {
      // Use start_date, or created_at as fallback
      const projectDate = project.start_date || project.created_at;
      if (!projectDate) return;
      
      const date = new Date(projectDate);
      const projectYear = date.getFullYear();
      const selectedYearInt = parseInt(selectedYear);
      
      if (projectYear !== selectedYearInt) return;
      
      const monthIndex = date.getMonth();
      const profit = project.profit || 0;
      const costs = project.total_costs_incl_vat || 0;
      const revenue = profit + costs;
      
      monthlyData[monthIndex].revenue += revenue;
      monthlyData[monthIndex].costs += costs;
      monthlyData[monthIndex].profit += profit;
      monthlyData[monthIndex].projects += 1;
    });

    return Object.values(monthlyData);
  };

  // Calculate quarterly data
  const getQuarterlyData = () => {
    const quarters = [
      { name: 'Q1 (Jan-Mrt)', months: [0, 1, 2] },
      { name: 'Q2 (Apr-Jun)', months: [3, 4, 5] },
      { name: 'Q3 (Jul-Sep)', months: [6, 7, 8] },
      { name: 'Q4 (Okt-Dec)', months: [9, 10, 11] }
    ];

    return quarters.map(quarter => {
      let revenue = 0, costs = 0, profit = 0, projectCount = 0;

      projects.forEach(project => {
        const projectDate = project.start_date || project.created_at;
        if (!projectDate) return;
        
        const date = new Date(projectDate);
        const projectYear = date.getFullYear();
        const selectedYearInt = parseInt(selectedYear);
        
        if (projectYear !== selectedYearInt) return;
        
        const monthIndex = date.getMonth();
        if (!quarter.months.includes(monthIndex)) return;

        const projProfit = project.profit || 0;
        const projCosts = project.total_costs_incl_vat || 0;
        
        profit += projProfit;
        costs += projCosts;
        revenue += projProfit + projCosts;
        projectCount += 1;
      });

      return {
        quarter: quarter.name,
        revenue,
        costs,
        profit,
        projects: projectCount
      };
    });
  };

  // Calculate yearly totals (for selected year)
  const getYearlyData = () => {
    const selectedYearInt = parseInt(selectedYear);
    let yearData = {
      year: selectedYearInt,
      revenue: 0,
      costs: 0,
      profit: 0,
      projects: 0
    };
    
    projects.forEach(project => {
      const projectDate = project.start_date || project.created_at;
      if (!projectDate) return;
      
      const year = new Date(projectDate).getFullYear();
      
      if (year !== selectedYearInt) return;

      const profit = project.profit || 0;
      const costs = project.total_costs_incl_vat || 0;
      
      yearData.profit += profit;
      yearData.costs += costs;
      yearData.revenue += profit + costs;
      yearData.projects += 1;
    });

    return [yearData];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getData = () => {
    if (selectedView === 'month') return getMonthlyData();
    if (selectedView === 'quarter') return getQuarterlyData();
    return getYearlyData();
  };

  const data = getData();
  const totals = data.reduce((acc, item) => ({
    revenue: acc.revenue + (item.revenue || 0),
    costs: acc.costs + (item.costs || 0),
    profit: acc.profit + (item.profit || 0),
    projects: acc.projects + (item.projects || 0)
  }), { revenue: 0, costs: 0, profit: 0, projects: 0 });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={48} style={{color: '#1E40AF'}} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showBackToDashboard={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl" style={{backgroundColor: '#DBEAFE'}}>
              <TrendingUp size={28} style={{color: '#1E40AF'}} />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#1E40AF'}}>
                Financiën
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                Overzicht van omzet, kosten en winst
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">📅 Per Maand</SelectItem>
                <SelectItem value="quarter">📊 Per Kwartaal</SelectItem>
                <SelectItem value="year">🗓️ Per Jaar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Selecteer jaar" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableYears().map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#64748B'}}>Totale Omzet</p>
                  <p className="text-2xl font-bold mt-2" style={{color: '#1E3A8A'}}>
                    {formatCurrency(totals.revenue)}
                  </p>
                </div>
                <div className="p-3 rounded-full" style={{backgroundColor: '#DBEAFE'}}>
                  <DollarSign size={24} style={{color: '#1E40AF'}} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#64748B'}}>Totale Kosten</p>
                  <p className="text-2xl font-bold mt-2" style={{color: '#DC2626'}}>
                    {formatCurrency(totals.costs)}
                  </p>
                </div>
                <div className="p-3 rounded-full" style={{backgroundColor: '#FEE2E2'}}>
                  <TrendingUp size={24} style={{color: '#DC2626', transform: 'rotate(180deg)'}} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#64748B'}}>Totale Winst</p>
                  <p className="text-2xl font-bold mt-2" style={{color: totals.profit >= 0 ? '#059669' : '#DC2626'}}>
                    {formatCurrency(totals.profit)}
                  </p>
                </div>
                <div className="p-3 rounded-full" style={{backgroundColor: totals.profit >= 0 ? '#D1FAE5' : '#FEE2E2'}}>
                  <TrendingUp size={24} style={{color: totals.profit >= 0 ? '#059669' : '#DC2626'}} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#64748B'}}>Projecten</p>
                  <p className="text-2xl font-bold mt-2" style={{color: '#1E3A8A'}}>
                    {totals.projects}
                  </p>
                </div>
                <div className="p-3 rounded-full" style={{backgroundColor: '#DBEAFE'}}>
                  <Calendar size={24} style={{color: '#1E40AF'}} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4" style={{color: '#1E3A8A'}}>
              Gedetailleerd Overzicht
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{borderColor: '#E5E7EB'}}>
                    <th className="text-left py-3 px-4 font-semibold" style={{color: '#64748B'}}>
                      {selectedView === 'month' ? 'Maand' : selectedView === 'quarter' ? 'Kwartaal' : 'Jaar'}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold" style={{color: '#64748B'}}>Omzet</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{color: '#64748B'}}>Kosten</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{color: '#64748B'}}>Winst</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{color: '#64748B'}}>Projecten</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50" style={{borderColor: '#F3F4F6'}}>
                      <td className="py-3 px-4 font-medium" style={{color: '#1E3A8A'}}>
                        {row.month || row.quarter || row.year}
                      </td>
                      <td className="text-right py-3 px-4" style={{color: '#1E3A8A'}}>
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="text-right py-3 px-4" style={{color: '#DC2626'}}>
                        {formatCurrency(row.costs)}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold" style={{color: row.profit >= 0 ? '#059669' : '#DC2626'}}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="text-right py-3 px-4" style={{color: '#64748B'}}>
                        {row.projects}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold" style={{borderColor: '#E5E7EB'}}>
                    <td className="py-3 px-4" style={{color: '#1E3A8A'}}>TOTAAL</td>
                    <td className="text-right py-3 px-4" style={{color: '#1E3A8A'}}>
                      {formatCurrency(totals.revenue)}
                    </td>
                    <td className="text-right py-3 px-4" style={{color: '#DC2626'}}>
                      {formatCurrency(totals.costs)}
                    </td>
                    <td className="text-right py-3 px-4" style={{color: totals.profit >= 0 ? '#059669' : '#DC2626'}}>
                      {formatCurrency(totals.profit)}
                    </td>
                    <td className="text-right py-3 px-4" style={{color: '#64748B'}}>
                      {totals.projects}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
