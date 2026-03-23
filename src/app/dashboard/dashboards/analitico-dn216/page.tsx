"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { loadConsolidatedRevenues } from "@/lib/revenue-data-consolidated"
import { loadConsolidatedData as loadConsolidatedExpenses, loadOrganizations } from "@/lib/expense-data"
import allRevenuesData from "@/lib/all-revenues.json"
import allAccountsData from "@/lib/all-accounts.json"
import { ShieldCheck, Printer, Target, Building2, Ticket, PieChart as PieChartIcon, BarChart3, Presentation, BookOpen, Scaling, CheckCircle, Scale, Gavel, Database, Globe, AlertTriangle } from "lucide-react"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e']

const GEOJSON_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const BrazilMap = ({ data, selectedState, onSelectState }: any) => {
    const [geoData, setGeoData] = useState<any>(null);

    useEffect(() => {
        fetch(GEOJSON_URL)
            .then(res => res.json())
            .then(json => setGeoData(json))
            .catch(err => console.error("Error loading map:", err));
    }, []);

    if (!geoData) return <div className="h-64 flex items-center justify-center text-slate-400 animate-pulse">Carregando mapa...</div>;

    // Projection constants (Bounding box for Brazil)
    const minLong = -74, maxLong = -34;
    const minLat = -34, maxLat = 6;
    const width = 500, height = 500;

    const project = (coords: any[]) => {
        const x = (coords[0] - minLong) * (width / (maxLong - minLong));
        const y = (maxLat - coords[1]) * (height / (maxLat - minLat));
        return `${x},${y}`;
    };

    const maxValue = Math.max(...data.map((d: any) => d.value), 1);
    
    const getHeatColor = (stateAcronym: string) => {
        const stateData = data.find((d: any) => d.name === stateAcronym);
        if (!stateData) return '#f1f5f9';
        const ratio = stateData.value / maxValue;
        if (ratio > 0.8) return '#4338ca';
        if (ratio > 0.5) return '#6366f1';
        if (ratio > 0.2) return '#a5b4fc';
        return '#e0e7ff';
    };

    const stateNameToAcronym: { [key: string]: string } = {
        'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
        'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
        'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
        'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE', 'Piauí': 'PI',
        'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
        'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
        'Sergipe': 'SE', 'Tocantins': 'TO'
    };

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-xl" onClick={(e) => {
            if (e.target === e.currentTarget) onSelectState(null);
        }}>
            {geoData.features.map((feature: any, idx: number) => {
                const name = feature.properties.name;
                const acronym = stateNameToAcronym[name] || name;
                
                const geometry = feature.geometry;
                const type = geometry.type;
                
                // Handle both Polygon and MultiPolygon
                const polygons = type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

                const d = polygons.map((polygon: any) => {
                    // In GeoJSON Polygons, the first array is the outer ring
                    const outerRing = type === 'Polygon' ? polygon : polygon[0];
                    return `M ${outerRing.map((c: any) => project(c)).join(' L ')} Z`;
                }).join(' ');

                return (
                    <path
                        key={idx}
                        d={d}
                        fill={selectedState === acronym ? '#1e1b4b' : getHeatColor(acronym)}
                        stroke={selectedState === acronym ? '#fff' : '#ffffff'}
                        strokeWidth={selectedState === acronym ? "1.5" : "0.3"}
                        className="transition-all duration-300 cursor-pointer hover:opacity-80"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectState(acronym === selectedState ? null : acronym);
                        }}
                    >
                        <title>{name}</title>
                    </path>
                );
            })}
        </svg>
    );
}

function ReportContent() {
    const searchParams = useSearchParams()
    const isPrintMode = searchParams.get('print') === 'true'
    const [loading, setLoading] = useState(true)
    const [selectedState, setSelectedState] = useState<string | null>(null)

    const [metrics, setMetrics] = useState({
        receitaCorrente: 0,
        receitaCapital: 0,
        receitaFinanceira: 0,
        receitaBruta: 0,
        receitaLiquida: 0,
        cotaParteCFA: 0,
        despesaTotal: 0,
        despesaFinalistica: 0, 
        cotaParteDespesaTotal: 0, 
        cotaParteDespesaFinalistica: 0,
        transparenciaTotal: 0,
        transparenciaDiarias: 0,
        transparenciaPassagens: 0,
        transparenciaJetons: 0,
        regionalFinalistica: [] as any[],
        regionalRevenues: [] as any[],
        regionalExpenses: [] as any[],
        analyticalRevenues: [] as { name: string; value: number }[],
        topDespesas: [] as any[]
    })

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            
            const [orgs, revData, expData] = await Promise.all([
                loadOrganizations(),
                loadConsolidatedRevenues(),
                loadConsolidatedExpenses()
            ])
            
            let rCorrente = 0
            let rCapital = 0
            let rFinanc = 0
            let recBruta = 0

            const regRevMap: { [key: string]: { name: string; total: number } } = {}
            const analyticalRevenuesGroup: { [key: string]: number } = {}

            // Process Revenues
            Object.entries(revData).forEach(([orgId, orgData]: [string, any]) => {
                const orgName = orgs.find(o => o.id === orgId)?.name || 'Desconhecido'
                if (!regRevMap[orgId]) regRevMap[orgId] = { name: orgName, total: 0 }

                Object.entries(orgData).forEach(([accountId, valueObj]: [string, any]) => {
                    const val = valueObj.value || 0
                    if (val <= 0) return

                    const isAnalytical = (allRevenuesData as any[]).find(r => r.id === accountId && r.type === 'Analítica')
                    if (!isAnalytical) return

                    recBruta += val
                    regRevMap[orgId].total += val

                    if (accountId.startsWith('1.6')) { 
                        rFinanc += val
                    } else if (accountId.startsWith('2')) {
                        rCapital += val
                    } else if (accountId.startsWith('1')) {
                        rCorrente += val
                    }

                    const accName = isAnalytical.name || 'Outra Receita'
                    analyticalRevenuesGroup[accName] = (analyticalRevenuesGroup[accName] || 0) + val
                })
            })

            let despTotal = 0
            let despFin = 0
            let cPTotal = 0
            let cPFin = 0
            let dDiarias = 0
            let dPassagens = 0
            let dJetons = 0

            const regExpMap: { [key: string]: { name: string; total: number; fin: number } } = {}
            const despesasGroup: { [key: string]: number } = {}

            // Process Expenses
            Object.entries(expData).forEach(([orgId, orgData]: [string, any]) => {
                const orgName = orgs.find(o => o.id === orgId)?.name || 'Desconhecido'
                if (!regExpMap[orgId]) regExpMap[orgId] = { name: orgName, total: 0, fin: 0 }

                Object.entries(orgData).forEach(([accountId, valueObj]: [string, any]) => {
                    const total = valueObj.total || 0
                    const fin = valueObj.finalistica || 0
                    if (total <= 0) return

                    const accountMeta = (allAccountsData as any[]).find(a => a.id === accountId)
                    const accName = accountMeta?.name?.toLowerCase() || ''

                    despTotal += total
                    despFin += fin

                    regExpMap[orgId].total += total
                    regExpMap[orgId].fin += fin

                    // Cota Parte Despesa
                    if (accName.includes('cota parte ao cfa') || accName.includes('cota-parte')) {
                        cPTotal += total
                        cPFin += fin
                    }

                    // Transparência
                    if (accName.includes('diárias') || accName.includes('diarias')) dDiarias += total
                    if (accName.includes('passagens') || accName.includes('locomoção')) dPassagens += total
                    if (accName.includes('jetons') || accName.includes('jeton') || accName.includes('verba de representação') || accName.includes('jetton')) dJetons += total

                    // Synthetic Expense Grouping (x.x level)
                    const groupKey = accountId.substring(0, 3);
                    let groupName = 'Outras Despesas';
                    if (groupKey === '1.1') groupName = 'Pessoal e Encargos';
                    else if (groupKey === '1.2') groupName = 'Materiais de Consumo';
                    else if (groupKey === '1.3') groupName = 'Serv. Terceiros (PF)';
                    else if (groupKey === '1.4') groupName = 'Diárias';
                    else if (groupKey === '1.5') groupName = 'Jetons';
                    else if (groupKey === '1.6') groupName = 'Passagens';
                    else if (groupKey === '1.7') groupName = 'Serv. Terceiros (PJ)';
                    else if (groupKey === '1.8') groupName = 'Auxílios e Contrib.';
                    else if (groupKey === '2.1') groupName = 'Investimentos / Capital';

                    despesasGroup[groupName] = (despesasGroup[groupName] || 0) + total;
                })
            })

            const formatOrgName = (n: string) => n.replace('CONSELHO REGIONAL DE ADMINISTRACAO DO ', 'CRA-').replace('CONSELHO REGIONAL DE ADMINISTRACAO ', 'CRA-').replace(' ADMINISTRACA', '').trim();
            const extractStateId = (n: string) => formatOrgName(n).replace('CRA-', '').replace('CONSELHO FEDERAL DE ADMINISTRACAO', 'DF').trim();

            const revArr = Object.values(regRevMap)
                .map(r => ({ name: extractStateId(r.name), fullName: formatOrgName(r.name), value: r.total }))
                .filter(r => r.value > 0).sort((a,b) => b.value - a.value)

            const expArr = Object.values(regExpMap)
                .map(r => ({ name: extractStateId(r.name), fullName: formatOrgName(r.name), value: r.total }))
                .filter(r => r.value > 0).sort((a,b) => b.value - a.value)

            const chartMapFin = Object.values(regExpMap)
                .map(r => ({ name: extractStateId(r.name), fullName: formatOrgName(r.name), percent: r.total > 0 ? (r.fin / r.total) * 100 : 0, fin: r.fin, total: r.total }))
                .filter(r => r.total > 0)
                .sort((a, b) => b.percent - a.percent)

            const topExpensesArr = Object.keys(despesasGroup)
                .map(k => ({ name: k, value: despesasGroup[k] }))
                .filter(x => x.value > 0)
                .sort((a, b) => b.value - a.value)

            const analRevenuesArr = Object.entries(analyticalRevenuesGroup)
                .map(([name, value]) => ({ name, value }))
                .sort((a,b) => b.value - a.value)

            setMetrics({
                receitaBruta: recBruta,
                receitaCorrente: rCorrente,
                receitaCapital: rCapital,
                receitaFinanceira: rFinanc,
                receitaLiquida: recBruta - cPTotal, 
                cotaParteCFA: cPTotal,
                despesaTotal: despTotal,
                despesaFinalistica: despFin,
                cotaParteDespesaTotal: cPTotal,
                cotaParteDespesaFinalistica: cPFin,
                transparenciaTotal: dDiarias + dPassagens + dJetons,
                transparenciaDiarias: dDiarias,
                transparenciaPassagens: dPassagens,
                transparenciaJetons: dJetons,
                regionalFinalistica: chartMapFin,
                regionalRevenues: revArr,
                regionalExpenses: expArr,
                analyticalRevenues: analRevenuesArr,
                topDespesas: topExpensesArr
            })
            setLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        if (!loading && isPrintMode) {
            setTimeout(() => window.print(), 2000)
        }
    }, [loading, isPrintMode])

    if (loading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse text-lg">Iniciando compilação de dados macro para o Relatório de Gestão (DN 216/2025)...</div>
    }

    const { receitaBruta, receitaLiquida, cotaParteCFA, receitaCorrente, receitaCapital, receitaFinanceira, 
            despesaTotal, despesaFinalistica, cotaParteDespesaTotal, cotaParteDespesaFinalistica,
            transparenciaTotal, transparenciaDiarias, transparenciaPassagens, transparenciaJetons,
            regionalFinalistica, regionalRevenues, regionalExpenses, analyticalRevenues, topDespesas } = metrics

    const percentFinalistica = despesaTotal > 0 ? (despesaFinalistica / despesaTotal) * 100 : 0
    const percentFoc = 11 // FOC 2019 baseline

    const autonomiaData = [
        { name: 'Receitas Correntes', value: receitaCorrente },
        { name: 'Receitas Financeiras', value: receitaFinanceira },
        { name: 'Receitas de Capital', value: receitaCapital }
    ].filter(item => item.value > 0)

    const totalAnalitica = analyticalRevenues.reduce((acc, curr) => acc + curr.value, 0)

    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const cotaParteApoio = cotaParteDespesaTotal - cotaParteDespesaFinalistica;
    const hipoteseDespesaFinalistica = despesaFinalistica + cotaParteApoio; 
    const percentHipotese = despesaTotal > 0 ? (hipoteseDespesaFinalistica / despesaTotal) * 100 : 0;

    return (
        <div className="bg-white min-h-screen text-slate-800 print:bg-white p-4 md:p-8 max-w-5xl mx-auto shadow-sm print:shadow-none print:p-0">
            {/* Header */}
            <div className="mb-8 print:mb-6">
                {/* Top accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-700 rounded-full mb-6" />

                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    {/* Logo + Title block */}
                    <div className="flex items-start gap-5">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <img
                                src="/logo-consolida.png"
                                alt="Logo Consolida"
                                className="h-44 w-auto object-contain"
                            />
                        </div>

                        {/* Title block */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                    Sistema CFA/CRAs
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    Exercício 2025
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                Relatório Analítico de Gestão{' '}
                                <span className="text-emerald-600">DN 216/2025</span>
                            </h1>
                            <p className="text-slate-500 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                                Síntese Gerencial Consolidada do Sistema CFA/CRAs: Processo de Consolidação Contábil, Sustentabilidade Financeira e Esforço Finalístico.
                            </p>
                        </div>
                    </div>

                    {/* Print Button */}
                    {!isPrintMode && (
                        <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-md hover:bg-slate-800 transition font-bold flex items-center gap-2 print:hidden whitespace-nowrap flex-shrink-0">
                            <Printer size={18} /> Imprimir Relatório
                        </button>
                    )}
                </div>

                {/* Bottom border */}
                <div className="border-b-2 border-slate-100 mt-6" />
            </div>

            <div className="space-y-12 narrative-sections">
                
                {/* 1. Contexto */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-emerald-800 border-b border-emerald-100 pb-2">
                        <BookOpen size={24}/> 1. Contexto Estrutural e o Desafio da Consolidação (Sistema CFA/CRAs)
                    </h2>
                    <div className="text-slate-700 leading-relaxed text-justify space-y-4">
                        <p>
                            O Sistema CFA/CRAs é composto por 27 Conselhos Regionais (CRAs) e o Conselho Federal de Administração (CFA), cada qual gozando de autonomia administrativa e financeira. Historicamente, essa autonomia resultou na adoção de <strong>4 sistemas contábeis distintos</strong> espalhados pelas 28 entidades, gerando matrizes de lançamentos, nomenclaturas e classificações orçamentárias heterogêneas.
                        </p>
                        <p>
                            A superação destas assimetrias tornou-se o grande desafio de gestão pública na atualidade. Para atender às rigorosas premissas da <strong>DN TCU nº 216/2025</strong> — que exige a demonstração cabal do "valor efetivamente gasto com atividades de fiscalização do exercício profissional" (Capítulo II) —, o Tribunal de Contas da União (TCU) impõe uma visão unificada e padronizada. Para o TCU, o Sistema deve ser lido como um corpo sistêmico único, no qual o fluxo financeiro entre entidades deve ser depurado das despesas em prol da transparência das contas públicas e eficiência no atendimento à sociedade.
                        </p>
                    </div>
                </section>

                {/* 2. Ações do CFA */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-slate-800 border-b pb-2">
                        <ShieldCheck size={24}/> 2. Ações do CFA para Desempenho e Cumprimento da DN 216/2025
                    </h2>
                    <div className="text-slate-700 leading-relaxed text-justify space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-6">
                        <p>
                            Ante a iminente obrigação legal, o Conselho Federal agiu tempestivamente através da elaboração do Grupo de Trabalho instituído pela <strong>Portaria CFA nº 132</strong>, de 11 de novembro de 2025. O Presidente do CFA, fundamentando-se nos poderes da Lei nº 4.769/65 e na RN CFA nº 661/2024, guiou-se por considerandos cruciais:
                        </p>
                        <div className="pl-4 border-l-4 border-slate-300 text-sm italic my-4 space-y-2 text-slate-600">
                            <p>— Necessidade de normatização e padronização dos demonstrativos contábeis e dos centros de custos, em atendimento pleno ao TCU e aos princípios da Administração Pública;</p>
                            <p>— As premissas da IN TCU nº 84/2020 e da Decisão Normativa TCU nº 198/2022 para julgamento e prestação de contas;</p>
                            <p>— As normativas específicas recém-lançadas da <strong>Decisão Normativa TCU n° 216/2025</strong> para entidades de fiscalização profissional (UPC);</p>
                            <p>— A Portaria-SEGECEX nº 10/2025 que reforça as exigências via dados abertos.</p>
                        </div>
                        <p>
                            O Grupo de Trabalho arquitetou uma virada sistêmica desenhada em <strong>três etapas de consolidação</strong>, permitindo resolver o fato de que o exercício de 2026 corria o risco de nascer sem diretrizes seguras operacionais e com a entrega do balanço de 2025 prevista para 31 de maio de 2026.
                        </p>
                        
                        <div className="grid md:grid-cols-3 gap-4 mt-6">
                            <div className="bg-white p-4 border border-slate-100 rounded-lg shadow-sm flex flex-col items-center text-center">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full mb-3">
                                    <Gavel size={24} />
                                </div>
                                <h3 className="font-bold text-emerald-700 text-sm mb-2 uppercase tracking-wide">Etapa 1: Medida Cautelar (2025)</h3>
                                <p className="text-sm">Publicação da <strong>IN CFA Nº 007, de 27 de dezembro de 2025</strong>, priorizando um modelo de rateio e um centro de custos padrão imposto aos 27 regionais para evitar o vácuo de orientação em janeiro. Deu-se o passo inicial para a padronização.</p>
                            </div>
                            <div className="bg-white p-4 border border-slate-100 rounded-lg shadow-sm flex flex-col items-center text-center">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-3">
                                    <Database size={24} />
                                </div>
                                <h3 className="font-bold text-blue-700 text-sm mb-2 uppercase tracking-wide">Etapa 2: O Sistema "Consolida"</h3>
                                <p className="text-sm">Visto o curto prazo final de entrega (até 31/05/2026), o CFA desenvolveu tecnologia própria capaz de reunir, depurar e homogeneizar, de forma descentralizada, os gastos da atividade finalística, garantindo base fidedigna para metas do ano vigente.</p>
                            </div>
                            <div className="bg-white p-4 border border-slate-100 rounded-lg shadow-sm flex flex-col items-center text-center">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                                    <Globe size={24} />
                                </div>
                                <h3 className="font-bold text-indigo-700 text-sm mb-2 uppercase tracking-wide">Etapa 3: Integração Plena (2027)</h3>
                                <p className="text-sm">A consolidação estrutural para o exercício de 2027, implementando a adequação definitiva de um novo <strong>Plano de Contas Nacional</strong> imutável nos diversos sistemas, trazendo identificação objetiva de toda a cadeia de transparência e custeio finalístico.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Autonomia Financeira e Tributária */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-blue-800 border-b border-blue-100 pb-2">
                        <PieChartIcon size={24}/> 3. Panorama Consolidado de Receitas: Autonomia Financeira
                    </h2>
                    <div className="text-slate-700 leading-relaxed text-justify mb-5 space-y-4">
                        <p>
                            O termômetro do vigor fiscal da Autarquia deve ser lido pela sua <strong>arrecadação real</strong>. Para expurgar duplicidades da máquina, o primeiro passo técnico adotado por este sistema foi a <strong>diminuição das "Cotas-Partes" e transferências intra-sistema</strong>, gerando um valor depurado conhecido como "Arrecadação Livre".
                        </p>
                        <p>
                            As receitas que mantêm o Conselho têm origens híbridas: as <strong>Receitas Correntes</strong> (como as anuidades e serviços), as <strong>Receitas Financeiras</strong> (fruto de aplicações de superávit) e as <strong>Receitas de Capital</strong> (como alienação de bens ou repasses para obras), demonstrando a composição patrimonial e tributária do Sistema.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-8">
                        <div className="h-80 w-full mb-4 md:mb-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={autonomiaData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" labelLine={false} label={(props: any) => `${((props.percent || 0) * 100).toFixed(0)}%`}>
                                        {autonomiaData.map((e: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            {autonomiaData.map((item: {name: string, value: number}, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                        <span className="font-semibold text-slate-700 text-sm">{item.name}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 text-sm">{formatBRL(item.value)}</div>
                                </div>
                            ))}
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="block text-sm font-semibold text-blue-800 uppercase tracking-widest">Arrecadação Real Sistêmica (Líquida)</span>
                                <span className="block text-2xl font-black text-blue-900">{formatBRL(receitaLiquida)}</span>
                                <span className="block text-xs text-blue-600 mt-1">Deduções intra-sistema da Cota Parte realizadas: -{formatBRL(cotaParteCFA)}</span>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-3 ml-1">Detalhamento Analítico das Receitas (Sistêmico)</h3>
                    <div className="h-[450px] w-full bg-blue-50/30 border border-blue-100 rounded-2xl p-4 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticalRevenues} layout="vertical" margin={{ top: 20, right: 60, left: 140, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={130} 
                                    tick={{ fontSize: 10, fontWeight: 500 }} 
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip formatter={(v: number) => formatBRL(v)} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                    <LabelList dataKey="value" position="right" formatter={(v: any) => (v && totalAnalitica > 0) ? `${((Number(v) / totalAnalitica) * 100).toFixed(1)}%` : '0%'} fontSize={10} fontWeight="600" fill="#1e40af" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-slate-600 italic mb-8 px-2">
                        O detalhamento acima demonstra a composição granular das receitas, com destaque para a predominância das anuidades e taxas, que constituem o núcleo da sustentabilidade operacional do sistema.
                    </p>

                    <h3 className="text-lg font-bold text-slate-800 mb-3 ml-1">Participação na Arrecadação por Estado (CFA + Regional)</h3>
                    <div className="h-[450px] w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionalRevenues} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{fontSize: 10}} interval={0} height={60} />
                                <YAxis tickFormatter={(val) => `R$ ${(val/1000000).toFixed(1)}M`} width={70} />
                                <Tooltip formatter={(value: number) => formatBRL(value)} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-slate-600 italic mb-8 px-2">
                        A análise regionalizada revela a força dos polos econômicos e a eficácia da descentralização, garantindo que os recursos sejam distribuídos e aplicados diretamente em cada jurisdição do sistema.
                    </p>
                </section>

                {/* 4. Composição Macro das Despesas */}
                <section className="print:break-before-page">
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-rose-800 border-b border-rose-100 pb-2">
                        <BarChart3 size={24}/> 4. Composição Macro das Despesas 
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-justify mb-5">
                        O monitoramento amplo do vetor de despesas é imprescindível, já que abrange contas sintéticas consolidadas em toda as esferas do Sistema. O gráfico em cascata exibe onde repousam os gastos essenciais — como "Pessoal e Encargos", o fluxo natural de repasse da "Cota-Parte" entre regionais e Federal, "Custeio", até os aportes em capitalização de infraestrutura física e tecnológica (Investimentos). Comparando o esforço de caixa dos Regionais, é possível traçar paralelos gerenciais importantes.
                    </p>

                    <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-8">
                        <div className="h-80 w-full mb-4 md:mb-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={topDespesas} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" labelLine={false} label={(props: any) => `${((props.percent || 0) * 100).toFixed(0)}%`}>
                                        {topDespesas.map((e: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 mb-2 border-b pb-2">Macro-Composição Sistêmica (Nível x.x)</h3>
                            {topDespesas.map((item: {name: string, value: number}, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                        <span className="font-semibold text-slate-700 text-sm">{item.name}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 text-sm">{formatBRL(item.value)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-3 ml-1">Despesas Totais: Federal & Regionais (Consolidado)</h3>
                    <div className="h-[450px] w-full bg-rose-50/20 border border-rose-100 rounded-2xl p-4 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionalExpenses} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fecdd3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 10}} />
                                <YAxis tickFormatter={(v) => `R$${(v/1000000).toFixed(1)}M`} />
                                <Tooltip formatter={(v: number) => formatBRL(v)} />
                                <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-slate-600 italic mb-8 px-2 text-justify">
                        O gráfico de despesas por regional revela a força dos polos econômicos e a eficácia da descentralização, garantindo que os recursos sejam distribuídos e aplicados diretamente em cada jurisdição do sistema.
                    </p>
                </section>

                {/* 5. Raio-X da Transparência */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-orange-600 border-b border-orange-100 pb-2">
                        <Ticket size={24}/> 5. Raio-X sobre Diárias e Verbas Indenizatórias (Transparência Ativa)
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-justify mb-5">
                        Em nome do princípio máximo da transparência, as parcelas frequentemente alvos de escrutínio pelo ministério público e pela sociedade na gestão de pessoas e conselheiros — tais como concessão de <strong className="text-orange-600">Diárias, Passagens Aéreas, Locomoção e Jetons (Verbas de Representação)</strong> — foram agrupadas sistematicamente contrapondo-se à imensidão do Orçamento da Autarquia. 
                    </p>

                    <div className="bg-white border shadow-sm rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-full w-48 h-48 flex flex-col items-center justify-center shrink-0 shadow-sm relative">
                            <div className="absolute inset-x-0 w-full rounded-full border border-orange-200 animate-ping opacity-10" style={{height: '110%', width: '110%', top: '-5%', left: '-5%'}}></div>
                            <h4 className="text-orange-800 text-xs font-bold uppercase tracking-widest text-center mb-1">Impacto Global</h4>
                            <span className="text-4xl font-black text-orange-600">{despesaTotal > 0 ? ((transparenciaTotal / despesaTotal) * 100).toFixed(2) : 0}%</span>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                <span className="font-semibold text-slate-700">Diárias de Viagens</span>
                                <span className="font-bold text-slate-900 border-l px-4 border-slate-200">{formatBRL(transparenciaDiarias)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                <span className="font-semibold text-slate-700">Passagens / Locomoção</span>
                                <span className="font-bold text-slate-900 border-l px-4 border-slate-200">{formatBRL(transparenciaPassagens)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                <span className="font-semibold text-slate-700">Jetons / Repres. Mensais</span>
                                <span className="font-bold text-slate-900 border-l px-4 border-slate-200">{formatBRL(transparenciaJetons)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. Mapa de Esforço Descentralizado */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-indigo-800 border-b border-indigo-100 pb-2">
                        <Building2 size={24}/> 6. Mapa de Esforço Descentralizado de Fiscalização (CFA + CRAs)
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-justify mb-5">
                        O Brasil impõe dimensões continentais na tarefa de manter a excelência no registro e fiscalização profissional. Este painel mostra o percentual absoluto de investimento restrito na <strong>Atividade-Fim</strong> (fiscalizatória e conselhal) em toda a rede. Independentemente do porte nominal bilionário ou milenar do caixa do regional, mede-se aqui a eficiência alocativa da máquina. Verifica-se, assim, que a excelência nas entregas possui origem homogeneizada na ponta de atendimento à sociedade.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white border border-indigo-100 rounded-3xl p-6 mb-8 shadow-sm">
                        {/* Interactive Map */}
                        <div className="relative group">
                            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 absolute -top-2 left-4 bg-white px-2">Mapa de Calor Regional</h3>
                            <BrazilMap 
                                data={regionalExpenses} 
                                selectedState={selectedState} 
                                onSelectState={setSelectedState} 
                            />
                        </div>

                        {/* Stats Panel */}
                        <div className="space-y-6">
                            <div className="border-l-4 border-indigo-500 pl-6 py-2">
                                <h4 className="text-indigo-900 font-bold uppercase text-sm tracking-tighter mb-1">
                                    {selectedState ? `Regional: CRA-${selectedState}` : "Consolidado Nacional (SISTEMA)"}
                                </h4>
                                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                                    {formatBRL(selectedState 
                                        ? (regionalExpenses.find(r => r.name === selectedState)?.value || 0)
                                        : despesaTotal
                                    )}
                                </div>
                                <p className="text-slate-500 text-xs mt-1 uppercase font-semibold">Total de Despesas Empenhadas</p>
                            </div>

                            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-indigo-700 font-bold text-sm">Investimento Finalístico</span>
                                    <span className="text-2xl font-black text-indigo-900">
                                        {formatBRL(selectedState 
                                            ? (regionalFinalistica.find(r => r.name === selectedState)?.fin || 0)
                                            : despesaFinalistica
                                        )}
                                    </span>
                                </div>
                                <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-indigo-600 h-full transition-all duration-500" 
                                        style={{ width: `${selectedState 
                                            ? (regionalFinalistica.find(r => r.name === selectedState)?.percent || 0)
                                            : percentFinalistica
                                        }%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] font-bold text-indigo-400 uppercase">
                                    <span>Eficiência Alocativa</span>
                                    <span>{selectedState 
                                        ? (regionalFinalistica.find(r => r.name === selectedState)?.percent.toFixed(1) || 0)
                                        : percentFinalistica.toFixed(1)
                                    }%</span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 italic text-justify leading-relaxed">
                                {selectedState 
                                    ? `Os dados do regional ${selectedState} refletem o compromisso direto com a fiscalização local. Clique fora do mapa para retornar à visão consolidada de todo o país.`
                                    : "Clique em qualquer estado do mapa ao lado para visualizar o detalhamento individual de despesas e o índice de esforço finalístico daquele regional específico."
                                }
                            </p>
                        </div>
                    </div>

                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                        <div className="h-[450px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={regionalFinalistica} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 10}} />
                                    <YAxis tickFormatter={(v) => `${v}%`} />
                                    <Tooltip formatter={(v: number, name: string) => name === 'fin' ? [formatBRL(v), 'Val. Finalístico'] : [`${v.toFixed(1)}%`, 'Índice Fin. / Total Orçamento']} />
                                    <Bar dataKey="percent" name="Índice Finalístico" radius={[4, 4, 0, 0]}>
                                        {regionalFinalistica.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.percent >= percentFoc ? (selectedState === entry.name ? '#1e1b4b' : '#3b82f6') : (selectedState === entry.name ? '#1e1b4b' : '#93c5fd')} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-amber-900 font-bold text-sm mb-1 uppercase tracking-tight">Observação Técnica de Integração</h4>
                            <p className="text-amber-800 text-sm leading-relaxed text-justify">
                                Os resultados demonstrados são de livre preenchimento do regional, levando em consideração que em 2025 ainda não havia centro de custos padronizado nem orientativo pelo CFA. Embora haja disparidade entre regionais, a observância deve focar no sistema como um todo e não individualmente. Não há informação errada, mas sim uma natureza colaborativa e em fase de transição normativa.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 7. Desempenho da Atividade-Fim */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-emerald-800 border-b border-emerald-100 pb-2">
                        <Target size={24}/> 7. Desempenho da Atividade-Fim (Cumprimento Pleno da DN 216/2025)
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-justify mb-5">
                        O corolário da DN 216/2025, insculpido em seu Capítulo II, III dita com objetividade cirúrgica o descobrimento do valor consolidado entregue pela atividade-fim. Avaliando retrospectivamente apontamentos de tribunais de contas (índice 4%) e o forte choque do balanço apurado na <strong>Fiscalização de Orientação Centralizada – TCU/2019 de 11%</strong>, testemunhamos no exercício de 2025 o alcance maduro e comprovado do sistema de aprimoramento interno imposto pela atual diretoria federal.
                    </p>

                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-10 text-white shadow-md text-center relative overflow-hidden mb-6">
                        <h3 className="text-emerald-50 font-medium text-lg md:text-xl uppercase tracking-wider mb-2 z-10 relative">Investimento Finalístico Nacional Consolidado</h3>
                        <div className="text-6xl md:text-7xl font-extrabold my-2 z-10 relative drop-shadow-md">{percentFinalistica.toFixed(1)}%</div>
                        <p className="text-emerald-100 mt-2 z-10 relative text-sm md:text-base">Inversão sistêmica rigorosa em qualificação do fiscal, sistemas tecnológicos e julgamento, somando globalmente a injenção finalística de {formatBRL(despesaFinalistica)}.</p>
                        <Scaling className="absolute right-0 bottom-0 text-white opacity-10 w-64 h-64 -translate-y-8 translate-x-12 pointer-events-none" />
                    </div>
                </section>

                {/* 8. O Dilema da Cota Parte */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-slate-800 border-b pb-2">
                        <Scale size={24}/> 8. O Dilema da "Cota-Parte" no Orçamento de Despesas
                    </h2>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                        <p className="text-slate-600 leading-relaxed text-justify mb-5">
                            Uma análise avançada obriga lançar luz sob a "Cota-Parte", a transferência vinculada de 20% enviada pelos CRAs ao Conselho Federal. Por se tratar de um fluxo de saída no primeiro elo, ela integra a matriz de Despesas dos Conselhos Regionais (impactando grandemente o bolo final de {formatBRL(despesaTotal)}). Logo, é fator fundamental causador de falsa diluição do "Investimento Consolidado".
                        </p>
                        
                        <div className="grid md:grid-cols-2 gap-6 items-start">
                            <div>
                                <ul className="text-sm text-slate-700 space-y-3 font-medium mb-4">
                                    <li className="flex justify-between items-center bg-slate-50 p-3 rounded">
                                        <span>Fluxo Consolidado das Cotas-Partes:</span>
                                        <span className="font-bold text-slate-900">{formatBRL(cotaParteDespesaTotal)}</span>
                                    </li>
                                    <li className="flex justify-between items-center bg-slate-50 p-3 rounded">
                                        <span>Parcela Já Lançada como "Atividade-Fim":</span>
                                        <span className="font-bold text-slate-900">{formatBRL(cotaParteDespesaFinalistica)}</span>
                                    </li>
                                </ul>
                                <p className="text-sm text-slate-500 text-justify">
                                    Antes da simulação, apuramos que uma parcela relevante dos CRAs já contabilizou correta e formalmente as Cotas-Partes repassadas como custo atrelado à *atividade finalística*, pois o CF atua como supremo tribunal administrativo das fiscalizações regionais.
                                </p>
                            </div>
                            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-lg">
                                <h3 className="text-slate-300 font-bold mb-3 text-sm uppercase tracking-wider flex items-center gap-2"><CheckCircle size={16}/> Exercício Hipotético Contábil</h3>
                                <p className="text-slate-200 text-sm mb-4 leading-relaxed">Considerando a reclassificação de 100% dos repasses de Cota-Parte transferidas como Custo Finalístico, a distorção orçamentária que a segregação hoje causa seria solucionada, reajustando nosso Índice Finalístico Consolidado (que já é expressivo) para um novo recorde estrutural no sistema público:</p>
                                <div className="flex items-center gap-4 border-t border-slate-700 pt-3">
                                    <div className="text-4xl font-black text-emerald-400">{percentHipotese.toFixed(1)}%</div>
                                    <div className="text-sm font-medium text-slate-400">Total do Gasto Macroeconômico Finalístico</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 9. Resultado Consolidado: Superávit ou Déficit */}
                <section>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-slate-800 border-b pb-2">
                        <Scale size={24}/> 9. Resultado Financeiro Consolidado (Superávit / Déficit)
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-justify mb-6">
                        A equação fundamental de qualquer gestão pública repousa na relação entre o que se arrecada e o que se gasta. O gráfico abaixo apresenta a posição apurada do sistema CFA/CRAs, confrontando a <strong>Receita Bruta Consolidada</strong> com a <strong>Despesa Total Consolidada</strong>, revelando com transparência o resultado financeiro do exercício.
                    </p>

                    {(() => {
                        const saldo = receitaLiquida - despesaTotal
                        const isSuperavit = saldo >= 0
                        const resultData = [
                            { name: 'Receita Líquida', value: receitaLiquida },
                            { name: 'Despesa Total', value: despesaTotal },
                        ]
                        const CustomLabel = (props: any) => {
                            const { x, y, width, height, value } = props
                            if (!value || width < 80) return null
                            return (
                                <text x={x + width - 8} y={y + height / 2 + 5} textAnchor="end" fill="white" fontWeight="700" fontSize={13}>
                                    {formatBRL(value)}
                                </text>
                            )
                        }
                        return (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
                                    <div className="h-56 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={resultData} layout="vertical" barCategoryGap="25%" barGap={0} margin={{ top: 8, right: 20, left: 130, bottom: 8 }}>
                                                <XAxis type="number" hide={true} />
                                                <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 13, fontWeight: 700, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }}
                                                    formatter={(v: number) => [formatBRL(v), '']}
                                                    itemStyle={{ color: '#f8fafc' }}
                                                />
                                                <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={52}>
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#f43f5e" />
                                                    <LabelList content={<CustomLabel />} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className={`rounded-2xl p-6 flex flex-col gap-4 shadow-sm border ${isSuperavit ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isSuperavit ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                                            {isSuperavit ? '✅ Superávit' : '⚠️ Déficit'}
                                        </div>
                                        <div className={`text-xl font-black ${isSuperavit ? 'text-emerald-800' : 'text-rose-800'}`}>{formatBRL(Math.abs(saldo))}</div>
                                    </div>
                                    <div>
                                        <h4 className={`font-bold mb-2 ${isSuperavit ? 'text-emerald-900' : 'text-rose-900'}`}>
                                            {isSuperavit
                                                ? 'Sistema financeiramente equilibrado com saldo positivo'
                                                : 'Sistema registra consumo de reservas no exercício'}
                                        </h4>
                                        <p className={`text-sm leading-relaxed text-justify ${isSuperavit ? 'text-emerald-800' : 'text-rose-800'}`}>
                                            {isSuperavit
                                                ? `O Sistema CFA/CRAs encerrou o exercício com um superávit consolidado de ${formatBRL(saldo)}, evidenciando equilíbrio fiscal e capacidade de investimento para os exercícios seguintes. Este resultado reforça a solidez financeira do sistema e a gestão responsável dos recursos públicos.`
                                                : `O Sistema CFA/CRAs registrou um déficit consolidado de ${formatBRL(Math.abs(saldo))} no exercício, indicando que a despesa total superou a arrecadação. Este resultado deve ser analisado no contexto dos investimentos realizados e das reservas patrimoniais do sistema, que garantem a continuidade das atividades finalísticas.`}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <div className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Receita Líquida</div>
                                        <div className="text-lg font-black text-blue-900">{formatBRL(receitaLiquida)}</div>
                                    </div>
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                                        <div className="text-xs text-rose-600 font-bold uppercase tracking-wide mb-1">Despesa Total</div>
                                        <div className="text-lg font-black text-rose-900">{formatBRL(despesaTotal)}</div>
                                    </div>
                                    <div className={`border rounded-xl p-4 ${isSuperavit ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${isSuperavit ? 'text-emerald-600' : 'text-amber-600'}`}>Resultado</div>
                                        <div className={`text-lg font-black ${isSuperavit ? 'text-emerald-900' : 'text-amber-900'}`}>{isSuperavit ? '+' : '-'}{formatBRL(Math.abs(saldo))}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </section>

                {/* 10. Conclusão */}
                <section>
                    <h2 className="text-2xl font-bold mb-4 text-slate-800 border-b pb-2">Conclusão Governamental</h2>
                    <p className="text-slate-700 leading-relaxed text-justify p-6 bg-slate-50 border border-slate-200 rounded-xl font-medium">
                        O relatório técnico atesta o comprometimento integral do Sistema CFA/CRAs na conformidade com decisões federais como a DN TCU nº 216/2025. Ao transpor amarras contábeis decenais, modernizar sistemas em ciclos recordes como Etapa 1, e adotar o ecossistema "Consolida", a gestão conseguiu, além de uma histórica evolução e consolidação dos investimentos frente a FOC de 2019, entregar à sociedade brasileira demonstrações que consubstanciam controle orgânico sobre desperdícios (Raio-X da Transparência de verbas acessórias em níveis pífios). Consolida-se a autonomia robustecida pela inovação e fiscalização contínua que impulsionam o Federal de Administração.
                    </p>
                </section>

            </div>

            <style jsx global>{`
                @media print {
                    /* === CRÍTICO: Override do layout wrapper que limita a 1 página === */
                    /* O layout usa h-screen e overflow-auto que cortam o documento */
                    body > div,
                    .flex.h-screen {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    main,
                    .flex-1.overflow-auto {
                        overflow: visible !important;
                        height: auto !important;
                        display: block !important;
                    }

                    aside, header {
                        display: none !important;
                    }

                    /* === PÁGINA A4 === */
                    @page {
                        size: A4 portrait;
                        margin: 18mm 15mm 18mm 15mm;
                    }

                    /* === RESET GERAL === */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    html, body {
                        background: white !important;
                        font-family: 'Helvetica', 'Arial', sans-serif !important;
                        font-size: 9pt !important;
                        line-height: 1.5 !important;
                        scrollbar-width: none !important;
                    }

                    html::-webkit-scrollbar,
                    body::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                    }

                    /* === CONTAINER === */
                    .max-w-5xl, .max-w-4xl {
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    /* === TIPOGRAFIA === */
                    h1 { font-size: 16pt !important; margin-bottom: 6pt !important; }
                    h2 { font-size: 12pt !important; margin-bottom: 6pt !important; page-break-after: avoid; }
                    h3 { font-size: 10pt !important; margin-bottom: 4pt !important; page-break-after: avoid; }
                    h4 { font-size: 9pt !important; margin-bottom: 3pt !important; }
                    p  { font-size: 9pt !important; margin-bottom: 6pt !important; line-height: 1.5 !important; }
                    li { font-size: 9pt !important; }

                    /* === SEÇÕES === */
                    section {
                        page-break-inside: avoid;
                        break-inside: avoid;
                        margin-bottom: 20pt !important;
                        padding-bottom: 10pt !important;
                    }

                    /* Forçar quebra de página antes de seções longas */
                    section:nth-child(n+3) {
                        page-break-before: auto;
                    }

                    /* === BOTÕES E CONTROLES === */
                    button, .no-print { display: none !important; }

                    /* === CARDS / CAIXAS === */
                    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
                        box-shadow: none !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                    .rounded-2xl, .rounded-xl, .rounded-lg {
                        border-radius: 4pt !important;
                    }

                    /* === FUNDOS — preservar cores para impressão === */
                    .bg-slate-50   { background-color: #f8fafc !important; }
                    .bg-slate-100  { background-color: #f1f5f9 !important; }
                    .bg-slate-900, .bg-gradient-to-br.from-slate-900 { background-color: #1e293b !important; }
                    .bg-indigo-50  { background-color: #eef2ff !important; }
                    .bg-emerald-50 { background-color: #ecfdf5 !important; }
                    .bg-amber-50   { background-color: #fffbeb !important; }
                    .bg-rose-50    { background-color: #fff1f2 !important; }
                    .bg-blue-50    { background-color: #eff6ff !important; }

                    /* Gradients para impressão */
                    .bg-gradient-to-r, .bg-gradient-to-br {
                        background-image: none !important;
                        background-color: #1e293b !important;
                        color: #fff !important;
                    }
                    .bg-gradient-to-r.from-emerald-500 {
                        background-color: #10b981 !important;
                    }

                    /* === TEXTO SOBRE FUNDOS ESCUROS === */
                    .text-white, .text-emerald-50, .text-slate-300, .text-slate-200 {
                        color: #fff !important;
                    }

                    /* === GRÁFICOS === */
                    .recharts-wrapper, .recharts-surface {
                        overflow: visible !important;
                    }
                    /* Reduzir altura dos gráficos para caber na A4 */
                    .h-\\[450px\\] { height: 260pt !important; }
                    .h-72  { height: 160pt !important; }
                    .h-80  { height: 180pt !important; }
                    .h-56  { height: 140pt !important; }
                    .h-64  { height: 150pt !important; }

                    /* === MAPA === */
                    svg { max-width: 100% !important; height: auto !important; }

                    /* === GRID — forçar coluna única em seções densas === */
                    .grid.md\\:grid-cols-2 { grid-template-columns: 1fr 1fr !important; gap: 10pt !important; }
                    .grid.grid-cols-3     { grid-template-columns: 1fr 1fr 1fr !important; gap: 6pt !important; }
                    .grid.md\\:grid-cols-3 { grid-template-columns: 1fr 1fr 1fr !important; gap: 6pt !important; }

                    /* === ESPAÇAMENTO === */
                    .p-6  { padding: 8pt !important; }
                    .p-4  { padding: 6pt !important; }
                    .mb-8 { margin-bottom: 10pt !important; }
                    .mb-6 { margin-bottom: 8pt !important; }
                    .space-y-6 > * + * { margin-top: 8pt !important; }
                    .gap-8 { gap: 10pt !important; }
                }
            `}</style>
        </div>
    )
}

export default function DN216ReportPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 text-lg">Iniciando compilação de dados macro para o Relatório de Gestão (DN 216/2025)...</div>}>
            <ReportContent />
        </Suspense>
    )
}
