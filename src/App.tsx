import React, { useState } from 'react';
import Papa from 'papaparse';

import './App.css';

interface CSVRow {
  Date: string;
  Description: string;
  Category: string;
  Cost: string;
  Currency: string;
  [key: string]: string; // Additional columns for people's expenses
}

const App: React.FC = () => {
  const [numLines, setNumLines] = useState<number>(0);
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
              setNumLines(data.length);
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
      const cost = parseFloat(row['Cost']);
      Object.keys(row).forEach((key) => {
        if (!['Date', 'Description', 'Category', 'Cost', 'Currency'].includes(key)) {
          const amount = parseFloat(row[key]);
          if (!isNaN(amount)) {
            if (amount > 0) {
              expenseMap[key] = (expenseMap[key] || 0) + (cost - amount);
            } else {
              expenseMap[key] = (expenseMap[key] || 0) + Math.abs(amount);
            }
          }
        }
      });
    });

    setExpenses(expenseMap);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Number of lines:', numLines);
    console.log('Expenses:', expenses);
  };

  return (
    <div className='App'>
      <header className="App-header">
        <p>Upload CSV File From Splitwise Export</p>
        <form onSubmit={handleSubmit}>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
          <button type="submit">Submit</button>
        </form>
        <div>
          <p>Number of lines: {numLines}</p>
          <h3>Expenses:</h3>
          <ul>
            {Object.keys(expenses).map((person) => (
              <li key={person}>
                {person}: {expenses[person].toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
};

export default App;
