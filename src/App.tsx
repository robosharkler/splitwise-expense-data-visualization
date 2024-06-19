import React, { useState } from 'react';
import Papa from 'papaparse';

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
              const data = results.data as Array<CSVRow>;
              calculateExpenses(data);
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const calculateExpenses = (data: Array<CSVRow>) => {
    const expenseMap: Record<string, number> = {};

    data.forEach((row) => {
      const category = row['Category'];
      const cost = parseFloat(row['Cost']);
      if (!isNaN(cost)) {
        if (expenseMap[category]) {
          expenseMap[category] += cost;
        } else {
          expenseMap[category] = cost;
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
          <h3>Expenses by Category:</h3>
          <ul>
            {Object.keys(expenses).map((category) => (
              <li key={category}>
                {category}: {expenses[category].toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
};

export default App;
