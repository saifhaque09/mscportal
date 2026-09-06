import React, { useEffect, useState } from 'react';
import useReportsApi from '@/api/useReportsApi';

const SimpleBarChart = ({ data, labels, currency = "CAD" }) => {
  const maxVal = Math.max(...data) || 1;
  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
      }).format(value);
    } catch (e) {
      return `${currency} ${value}`;
    }
  };

  return (
    <div className="flex items-end justify-between h-[220px] w-full pt-8 border-b border-gray-100 relative">
      <div className="absolute top-8 left-0 w-full h-[1px] bg-gray-50"></div>
      <div className="absolute top-[30%] left-0 w-full h-[1px] bg-gray-50"></div>
      <div className="absolute top-[55%] left-0 w-full h-[1px] bg-gray-50"></div>
      <div className="absolute top-[80%] left-0 w-full h-[1px] bg-gray-50"></div>

      {data.map((val, i) => (
        <div key={i} className="flex flex-col items-center w-full z-10 group h-full justify-end relative pb-6">
          {/* Custom Tooltip */}
          <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 flex flex-col items-center">
            <span className="px-2 py-1 text-[10px] font-bold text-white bg-slate-900 rounded shadow-lg whitespace-nowrap">
              {formatCurrency(val)}
            </span>
            <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1"></div>
          </div>

          <div
            className="w-8 sm:w-12 bg-[#3EA286] rounded-t-[4px] transition-all duration-500 ease-out hover:opacity-80"
            style={{ height: `${Math.max((Math.max(val, 0) / maxVal) * 75, 2)}%`, opacity: val === 0 ? 0.2 : 1 }}
          ></div>
          <span className="text-[11px] text-muted-foreground mt-2 font-medium whitespace-nowrap absolute bottom-0">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

const BarChartSkeleton = () => (
  <div className="flex items-end justify-between h-[220px] w-full pt-8 border-b border-gray-100 relative animate-pulse">
    <div className="absolute top-8 left-0 w-full h-[1px] bg-gray-50"></div>
    <div className="absolute top-[30%] left-0 w-full h-[1px] bg-gray-50"></div>
    <div className="absolute top-[55%] left-0 w-full h-[1px] bg-gray-50"></div>
    <div className="absolute top-[80%] left-0 w-full h-[1px] bg-gray-50"></div>

    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex flex-col items-center w-full z-10 h-full justify-end pb-6 relative">
        <div className="w-8 sm:w-12 bg-gray-200 rounded-t-[4px] h-[30%]"></div>
        <div className="w-10 h-3 bg-gray-200 rounded mt-2 absolute bottom-0"></div>
      </div>
    ))}
  </div>
);

const DonutChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full animate-pulse">
        <div className="relative w-[180px] h-[180px] mx-auto mt-4 rounded-full bg-muted"></div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 w-full mt-10">
          <div className="h-4 w-24 bg-muted rounded"></div>
          <div className="h-4 w-24 bg-muted rounded"></div>
          <div className="h-4 w-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const currency = data?.currency || "CAD";
  const totalAmount = data?.total_amount || 0;
  const segments = data?.segments || [];

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
      }).format(value);
    } catch (e) {
      return `${currency} ${value}`;
    }
  };

  const totalPercentage = segments.reduce((sum, s) => sum + (s.percentage || 0), 0);

  let accumulated = 0;
  const gradientParts = [];
  const labelsToRender = [];

  if (totalPercentage > 0) {
    segments.forEach((seg) => {
      const start = accumulated;
      const end = accumulated + seg.percentage;
      gradientParts.push(`${seg.color} ${start}% ${end}%`);

      if (seg.percentage > 5) {
        let x = 50;
        let y = 50;
        if (seg.percentage < 99) {
          const midPercentage = start + seg.percentage / 2;
          const angleRad = (midPercentage / 100) * 2 * Math.PI;
          const r = 38.5; // Radius centered in the donut ring (outer is 50%, inner is 27%)
          x = 50 + r * Math.sin(angleRad);
          y = 50 - r * Math.cos(angleRad);
        }

        const isLightColor = seg.color === '#EFCD72' || seg.color === '#d4a84b' || seg.color?.toLowerCase() === '#efcd72';
        const textColor = isLightColor ? '#1e293b' : '#ffffff';

        labelsToRender.push({
          text: `${Math.round(seg.percentage)}%`,
          style: {
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: '11px',
            fontWeight: 'bold',
            color: textColor,
            pointerEvents: 'none',
            textShadow: isLightColor ? 'none' : '0px 1px 2px rgba(0,0,0,0.3)',
          }
        });
      }
      accumulated = end;
    });
  }

  const backgroundStyle = totalPercentage > 0
    ? `conic-gradient(${gradientParts.join(', ')})`
    : '#e2e8f0';

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative w-[180px] h-[180px] mx-auto mt-4">
        {/* Outer Circle */}
        <div
          className="w-full h-full rounded-full border-[1px] border-border shadow-sm transition-transform hover:scale-105 duration-300"
          style={{ background: backgroundStyle }}
        ></div>

        {/* Labels */}
        {labelsToRender.map((label, idx) => (
          <span key={idx} style={label.style}>
            {label.text}
          </span>
        ))}

        {/* Inner Donut hole containing total amount */}
        <div className="absolute top-[23%] left-[23%] w-[54%] h-[54%] rounded-full bg-card shadow-inner flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Total</span>
          <span className="text-[14px] font-extrabold text-foreground tracking-tight">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 w-full mt-10 text-[12px] text-muted-foreground font-medium tracking-wide">
        {segments.length > 0 ? (
          segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }}></div>
              <span>{seg.label}</span>
              <span className="text-[11px] text-muted-foreground font-semibold">
                ({Math.round(seg.percentage)}% - {formatCurrency(seg.amount)})
              </span>
            </div>
          ))
        ) : (
          <span className="text-muted-foreground text-[11px]">No segments available</span>
        )}
      </div>
    </div>
  );
};


const ProfitLossChart = ({ organizationId, refreshKey }) => {
  const { getNetIncomeTrend, getNetExpensesTrend, getNetIncomeChart, getExpensesByCategoryChart } = useReportsApi();
  const [netIncomeData, setNetIncomeData] = useState([]);
  const [netExpensesData, setNetExpensesData] = useState([]);
  const [netIncomeChartData, setNetIncomeChartData] = useState(null);
  const [expensesCategoryData, setExpensesCategoryData] = useState(null);
  const [incomeCurrency, setIncomeCurrency] = useState("CAD");
  const [expensesCurrency, setExpensesCurrency] = useState("CAD");
  const [loadingIncome, setLoadingIncome] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingChartData, setLoadingChartData] = useState(false);
  const [loadingExpensesChart, setLoadingExpensesChart] = useState(false);

  useEffect(() => {
    if (organizationId) {
      const fetchIncome = async () => {
        setLoadingIncome(true);
        const payload = await getNetIncomeTrend({
          organizationId,
          endYear: new Date().getFullYear(),
        });
        if (payload && payload.bars) {
          setNetIncomeData(payload.bars);
          if (payload.currency) {
            setIncomeCurrency(payload.currency);
          }
        }
        setLoadingIncome(false);
      };

      const fetchExpenses = async () => {
        setLoadingExpenses(true);
        const payload = await getNetExpensesTrend({
          organizationId,
          endYear: new Date().getFullYear(),
        });
        if (payload && payload.bars) {
          setNetExpensesData(payload.bars);
          if (payload.currency) {
            setExpensesCurrency(payload.currency);
          }
        }
        setLoadingExpenses(false);
      };

      const fetchNetIncomeChart = async () => {
        setLoadingChartData(true);
        const payload = await getNetIncomeChart({
          organizationId,
          year: new Date().getFullYear(),
        });
        if (payload) {
          setNetIncomeChartData(payload);
        }
        setLoadingChartData(false);
      };

      const fetchExpensesCategoryChart = async () => {
        setLoadingExpensesChart(true);
        const payload = await getExpensesByCategoryChart({
          organizationId,
          year: new Date().getFullYear(),
        });
        if (payload) {
          setExpensesCategoryData(payload);
        }
        setLoadingExpensesChart(false);
      };

      fetchIncome();
      fetchExpenses();
      fetchNetIncomeChart();
      fetchExpensesCategoryChart();
    }
  }, [organizationId, refreshKey]);

  const years = netIncomeData.length > 0
    ? netIncomeData.map(item => item.year.toString())
    : ["2021", "2022", "2023", "2024", "2025", "2026"];
  const netIncomeTrend = netIncomeData.length > 0
    ? netIncomeData.map(item => item.net_income)
    : [0, 0, 0, 0, 0, 0];

  const expensesYears = netExpensesData.length > 0
    ? netExpensesData.map(item => item.year.toString())
    : ["2021", "2022", "2023", "2024", "2025", "2026"];
  const netExpensesTrend = netExpensesData.length > 0
    ? netExpensesData.map(item => item.net_expenses)
    : [0, 0, 0, 0, 0, 0];

  return (
    <div className="w-full flex flex-col gap-4 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Net Income Till Date (Pie) */}
        <div className="bg-card rounded-xl shadow-sm border p-6 flex flex-col items-start w-full">
          <h3 className="text-[14px] text-card-foreground tracking-wide font-semibold text-center sm:text-left mb-2">
            {netIncomeChartData?.title || "Net Income Till Date"}{" "}
            <span className="font-medium text-muted-foreground text-[13px]">
              ({netIncomeChartData?.year || new Date().getFullYear()})
            </span>
          </h3>
          <DonutChart data={netIncomeChartData} loading={loadingChartData} />
        </div>

        {/* Net Income Trend Bar Chart */}
        <div className="bg-card rounded-xl shadow-sm border p-6 flex flex-col items-start w-full">
          <h3 className="text-[14px] text-card-foreground tracking-wide font-semibold mb-2">Net Income Trend</h3>
          {loadingIncome ? (
            <BarChartSkeleton />
          ) : (
            <SimpleBarChart data={netIncomeTrend} labels={years} currency={incomeCurrency} />
          )}
        </div>

        {/* Expenses By Category (Pie) */}
        <div className="bg-card rounded-xl shadow-sm border p-6 flex flex-col items-start w-full">
          <h3 className="text-[14px] text-card-foreground tracking-wide font-semibold text-center sm:text-left mb-2">
            {expensesCategoryData?.title || "Expenses By Category"}{" "}
            <span className="font-medium text-muted-foreground text-[13px]">
              ({expensesCategoryData?.year || new Date().getFullYear()})
            </span>
          </h3>
          <DonutChart data={expensesCategoryData} loading={loadingExpensesChart} />
        </div>

        {/* Net Expenses Trend Bar Chart */}
        <div className="bg-card rounded-xl shadow-sm border p-6 flex flex-col items-start w-full">
          <h3 className="text-[14px] text-card-foreground tracking-wide font-semibold mb-2">Net Expenses Trend</h3>
          {loadingExpenses ? (
            <BarChartSkeleton />
          ) : (
            <SimpleBarChart data={netExpensesTrend} labels={expensesYears} currency={expensesCurrency} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitLossChart;

