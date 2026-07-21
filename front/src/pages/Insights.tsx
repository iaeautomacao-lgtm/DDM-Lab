import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Target,
  BrainCircuit,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { fetchInsightsPageData, InsightsPageData } from '../lib/supabaseData';

const EMPTY_DATA: InsightsPageData = {
  summary: {
    avgMaturityScore: 0,
    activeUsers: 0,
    totalPrompts: 0,
    timeSavedHours: 0,
  },
  maturityData: [],
  sectorData: [],
  people: [],
};

export const Insights = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [selectedUnit, setSelectedUnit] = useState('Todas');
  const [data, setData] = useState<InsightsPageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const nextData = await fetchInsightsPageData();
        setData(nextData);
      } catch (error) {
        console.error('Erro ao carregar insights:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, []);

  const sectorOptions = useMemo(
    () => ['Todos', ...Array.from(new Set(data.people.map((person) => person.sector)))],
    [data.people]
  );

  const filteredPeople = useMemo(() => {
    return data.people.filter((person) => {
      const matchesSearch =
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = selectedSector === 'Todos' || person.sector === selectedSector;
      const matchesUnit = selectedUnit === 'Todas' || person.unit === selectedUnit;
      return matchesSearch && matchesSector && matchesUnit;
    });
  }, [data.people, searchTerm, selectedSector, selectedUnit]);

  if (loading) {
    return <div className="p-10 text-center text-text-secondary">Carregando insights...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Análises Estratégicas</h1>
        <p className="mt-2 text-text-secondary">Análise estratégica de adoção e maturidade de IA no DDM Lab.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Maturidade Média', value: data.summary.avgMaturityScore.toFixed(1), icon: Target },
          { label: 'Usuários Ativos', value: String(data.summary.activeUsers), icon: Users },
          { label: 'Prompts Gerados', value: String(data.summary.totalPrompts), icon: TrendingUp },
          { label: 'Economia de Tempo', value: `${data.summary.timeSavedHours.toFixed(0)}h`, icon: BrainCircuit },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <stat.icon size={20} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                <ArrowUpRight size={14} />
                Atualizado
              </div>
            </div>
            <div className="mb-1 text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl border border-border bg-surface p-8 lg:col-span-2"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Evolução da Maturidade</h2>
              <p className="text-sm text-text-secondary">Média de maturidade dos usuários ativos por mês</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            {data.maturityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.maturityData}>
                  <defs>
                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5100" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF5100" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="month" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="level" stroke="#FF5100" strokeWidth={3} fillOpacity={1} fill="url(#colorLevel)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary">
                Sem dados suficientes para montar a evolução.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl border border-border bg-surface p-8"
        >
          <h2 className="mb-2 text-xl font-bold text-white">Uso por Setor</h2>
          <p className="mb-8 text-sm text-text-secondary">Volume real de interações mensais</p>

          <div className="h-[300px] w-full">
            {data.sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sectorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#ffffff60" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }} />
                  <Bar dataKey="usage" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-text-secondary">
                Sem uso por setor registrado ainda.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="space-y-6 rounded-3xl border border-border bg-surface p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Pessoas e Setores</h2>
          <p className="text-sm text-text-secondary">Busque rapidamente por nome, e-mail, setor ou unidade.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-text-secondary/60 focus:border-primary"
            />
          </div>

          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
          >
            {sectorOptions.map((sector) => (
              <option key={sector} value={sector} className="bg-surface text-white">
                {sector === 'Todos' ? 'Todos os setores' : sector}
              </option>
            ))}
          </select>

          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
          >
            {['Todas', 'DDM - São Paulo', 'DDM - Rio de Janeiro'].map((unit) => (
              <option key={unit} value={unit} className="bg-surface text-white">
                {unit === 'Todas' ? 'Todas as unidades' : unit}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_160px_110px_130px] gap-4 border-b border-border bg-white/[0.02] px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-text-secondary">
            <span>Colaborador</span>
            <span>Setor</span>
            <span>Unidade</span>
            <span>Prompts</span>
            <span>Maturidade</span>
          </div>

          {filteredPeople.length > 0 ? (
            filteredPeople.map((person) => (
              <div
                key={person.id}
                className="grid grid-cols-[minmax(0,1.4fr)_1fr_160px_110px_130px] gap-4 border-b border-border/80 px-5 py-4 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{person.name}</p>
                  <p className="truncate text-xs text-text-secondary">{person.email}</p>
                </div>
                <span className="text-text-secondary">{person.sector}</span>
                <span className="text-text-secondary">{person.unit}</span>
                <span className="font-semibold text-white">{person.prompts}</span>
                <span className="text-primary">{person.maturity}</span>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-text-secondary">Nenhum colaborador encontrado com os filtros selecionados.</div>
          )}
        </div>
      </div>
    </div>
  );
};
