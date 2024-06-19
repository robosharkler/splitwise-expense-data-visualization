import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns';

import './App.css';

interface CSVRow {
  Date: string;
  Description: string;
  Category: string;
  Cost: string;
  Currency: string;
}

interface ExpensesByCategory {
  [category: string]: {
    [date: string]: number;
  };
}

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpensesByCategory>({});
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [data, setData] = useState<Array<CSVRow>>([]);
  const [granularity, setGranularity] = useState<string>('default');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set<string>());
  const [showTotal, setShowTotal] = useState<boolean>(true);

  useEffect(() => {
    calculateExpenses();
  }, [startDate, endDate, granularity, data]);


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
    const expenseMap: ExpensesByCategory = {};
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
          if (!expenseMap[category]) {
            expenseMap[category] = {};
          }
          if (expenseMap[category][formattedDate]) {
            expenseMap[category][formattedDate] += cost;
          } else {
            expenseMap[category][formattedDate] = cost;
          }
        }
      }
    });

    setExpenses(expenseMap);
  };

  const aggregateExpenses = () => {
    const interval = endDate && startDate ? endDate.getTime() - startDate.getTime() : 0;
    const days = Math.ceil(interval / (1000 * 60 * 60 * 24));

    const aggregated: ExpensesByCategory = {};
    Object.keys(expenses).forEach(category => {
      aggregated[category] = {};

      if (granularity === 'weekly' || (granularity === 'default' && days < 30)) {
        // Week level granularity
        const weeks = eachWeekOfInterval({ start: startDate!, end: endDate! });
        weeks.forEach(week => {
          const formattedWeek = format(week, 'yyyy-ww');
          aggregated[category][formattedWeek] = 0;
        });

        Object.keys(expenses[category]).forEach(date => {
          const week = format(new Date(date), 'yyyy-ww');
          if (aggregated[category][week] !== undefined) {
            aggregated[category][week] += expenses[category][date];
          }
        });
      } else {
        // Month level granularity (default)
        const months = eachMonthOfInterval({ start: startDate!, end: endDate! });
        months.forEach(month => {
          const formattedMonth = format(month, 'yyyy-MM');
          aggregated[category][formattedMonth] = 0;
        });

        Object.keys(expenses[category]).forEach(date => {
          const month = date.substring(0, 7); // yyyy-MM
          if (aggregated[category][month] !== undefined) {
            aggregated[category][month] += expenses[category][date];
          }
        });
      }
    });

    return aggregated;
  };

  const filteredTotalExpensesByDate = aggregateExpenses();

  // Function to generate datasets for selected categories
  const generateCategoryDatasets = () => {
    let datasets = Array.from(selectedCategories).map((category, index) => ({
      label: category,
      data: Object.keys(filteredTotalExpensesByDate[category] || {}).map(date => filteredTotalExpensesByDate[category][date]),
      fill: false,
      borderColor: `rgba(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},1)`,
      tension: 0.1,
    }));

    if (showTotal) {
      const totalData: { [date: string]: number } = {};
      Object.keys(filteredTotalExpensesByDate).forEach(category => {
        Object.keys(filteredTotalExpensesByDate[category]).forEach(date => {
          if (!totalData[date]) {
            totalData[date] = 0;
          }
          totalData[date] += filteredTotalExpensesByDate[category][date];
        });
      });

      const totalDataset = {
        label: 'TOTAL',
        data: Object.keys(totalData).map(date => totalData[date]),
        fill: false,
        borderColor: `rgba(255,99,132,1)`, // Red color for total
        tension: 0.1,
      };
      datasets.push(totalDataset);
    }

    return datasets;
  };

  const categoryDatasets = generateCategoryDatasets();

  const lineChartData = {
    labels: Object.keys(categoryDatasets[0].data || {}),
    datasets: categoryDatasets,
  };

  // Calculate expenses by category and sort them from high to low
  const expensesByCategory = Object.entries(expenses)
    .map(([category, categoryExpenses]) => ({
      category,
      totalCost: Object.values(categoryExpenses).reduce((acc, curr) => acc + curr, 0),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // Function to handle checkbox change
  const handleCheckboxChange = (category: string) => {
    const updatedCategories = new Set(selectedCategories);
    if (updatedCategories.has(category)) {
      updatedCategories.delete(category);
    } else {
      updatedCategories.add(category);
    }
    setSelectedCategories(updatedCategories);
  };

  // Function to handle TOTAL checkbox change
  const handleTotalCheckboxChange = () => {
    setShowTotal(!showTotal);
  };

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
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          {(selectedCategories.size > 0 || showTotal) && (
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
                <tr>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        checked={showTotal}
                        onChange={handleTotalCheckboxChange}
                      />
                      TOTAL
                    </label>
                  </td>
                  <td>{Object.values(expenses).reduce((acc, categoryExpenses) => {
                    return acc + Object.values(categoryExpenses).reduce((acc, curr) => acc + curr, 0);
                  }, 0).toFixed(2)}</td>
                </tr>
                {expensesByCategory.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(item.category)}
                          onChange={() => handleCheckboxChange(item.category)}
                        />
                        {item.category}
                      </label>
                    </td>
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
