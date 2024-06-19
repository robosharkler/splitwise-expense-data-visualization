import React, { useState } from 'react';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const calculateExpenses = () => {
    const expenseMap: Record<string, number> = {};

    data.forEach((row) => {
      const rowDate = new Date(row['Date']);
      if (
        (!startDate || rowDate >= startDate) &&
        (!endDate || rowDate <= endDate)
      ) {
        const category = row['Category'];
        const cost = parseFloat(row['Cost']);
        if (!isNaN(cost)) {
          if (expenseMap[category]) {
            expenseMap[category] += cost;
          } else {
            expenseMap[category] = cost;
          }
        }
      }
    });

    setExpenses(expenseMap);
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
        <button onClick={calculateExpenses}>Calculate</button>
        {Object.keys(expenses).length > 0 && (
          <div>
            <h3>Expenses by Category:</h3>
            <ul>
              {Object.keys(expenses).map((category) => (
                <li key={category}>
                  {category}: {expenses[category].toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
    </div>
  );
};

export default App;
