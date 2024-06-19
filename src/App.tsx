import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns';

import './App.css';

interface CSVRow {
  Date: string;
  Description: string;
  Category: string;
  Cost: string;
  Currency: string;
}

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [data, setData] = useState<Array<CSVRow>>([]);
  const [totalExpensesByDate, setTotalExpensesByDate] = useState<Record<string, number>>({});
  const [granularity, setGranularity] = useState<string>('default');

  useEffect(() => {
    calculateExpenses();
  }, [startDate, endDate, granularity]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const csvData = reader.result?.toString();
        if (csvData) {
          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const parsedData = results.data as Array<CSVRow>;
              setData(parsedData);
              if (parsedData.length > 0) {
                const dates = parsedData.map(row => new Date(row.Date));
                const minDate = new Date(Math.min(...dates.map(date => date.getTime())));
                const maxDate = new Date(Math.max(...dates.map(date => date.getTime())));
                setStartDate(minDate);
                setEndDate(maxDate);
              }
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const calculateExpenses = () => {
    const expenseMap: Record<string, number> = {};
    const totalExpensesMap: Record<string, number> = {};

    data.forEach((row) => {
      const rowDate = new Date(row['Date']);
      const formattedDate = rowDate.toISOString().split('T')[0];
      if (
        (!startDate || rowDate >= startDate) &&
        (!endDate || rowDate <= endDate) &&
        row['Category'] !== 'Payment' // Exclude 'Payment' category
      ) {
        const category = row['Category'];

        const cost = parseFloat(row['Cost']);
        if (!isNaN(cost)) {
          if (expenseMap[category]) {
            expenseMap[category] += cost;
          } else {
            expenseMap[category] = cost;
          }
          if (totalExpensesMap[formattedDate]) {
            totalExpensesMap[formattedDate] += cost;
          } else {
            totalExpensesMap[formattedDate] = cost;
          }
        }
      }
    });

    setExpenses(expenseMap);
    setTotalExpensesByDate(totalExpensesMap);
  };

  const aggregateExpenses = () => {
    const interval = endDate && startDate ? endDate.getTime() - startDate.getTime() : 0;
    const days = Math.ceil(interval / (1000 * 60 * 60 * 24));

    if (granularity === 'daily' || (granularity === 'default' && days <= 7)) {
      // Day level granularity
      return totalExpensesByDate;
    } else if (granularity === 'weekly' || (granularity === 'default' && days < 30)) {
      // Week level granularity
      const aggregated: Record<string, number> = {};
      const weeks = eachWeekOfInterval({ start: startDate!, end: endDate! });

      weeks.forEach(week => {
        const formattedWeek = format(week, 'yyyy-ww');
        aggregated[formattedWeek] = 0;
      });

      Object.keys(totalExpensesByDate).forEach(date => {
        const week = format(new Date(date), 'yyyy-ww');
        if (aggregated[week] !== undefined) {
          aggregated[week] += totalExpensesByDate[date];
        }
      });

      return aggregated;
    } else {
      // Month level granularity (default)
      const aggregated: Record<string, number> = {};
      const months = eachMonthOfInterval({ start: startDate!, end: endDate! });

      months.forEach(month => {
        const formattedMonth = format(month, 'yyyy-MM');
        aggregated[formattedMonth] = 0;
      });

      Object.keys(totalExpensesByDate).forEach(date => {
        const month = date.substring(0, 7); // yyyy-MM
        if (aggregated[month] !== undefined) {
          aggregated[month] += totalExpensesByDate[date];
        }
      });

      return aggregated;
    }
  };

  const filteredTotalExpensesByDate = aggregateExpenses();

  const lineChartData = {
    labels: Object.keys(filteredTotalExpensesByDate),
    datasets: [
      {
        label: 'Total Expenses',
        data: Object.values(filteredTotalExpensesByDate),
        fill: false,
        borderColor: 'rgba(75,192,192,1)',
        tension: 0.1,
      },
    ],
  };

  // Calculate expenses by category and sort them from high to low
  const expensesByCategory = Object.entries(expenses)
    .map(([category, totalCost]) => ({ category, totalCost }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className='App'>
      <header className="App-header">
        <p>Upload CSV File From Splitwise Export</p>
        <form>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </form>
        <div>
          <p>Select Date Range:</p>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date || undefined)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Start Date"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date || undefined)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="End Date"
          />
        </div>
        <div>
          <p>Select Granularity:</p>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
            <option value="default">Default</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          {Object.keys(expenses).length > 0 && (
            <div>
              <h3>Total Expenses Over Time</h3>
              <Line data={lineChartData} />
            </div>
          )}
        </div>

        {expensesByCategory.length > 0 && (
          <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto' }}>
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {expensesByCategory.map((item, index) => (
                  <tr key={index}>
                    <td>{item.category}</td>
                    <td>{item.totalCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </header>
    </div>
  );
};

export default App;
