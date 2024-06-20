import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { eachWeekOfInterval, eachMonthOfInterval, format } from 'date-fns';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Input,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import './App.css'

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
          const month = format(new Date(date), 'yyyy-MM');
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
      data: filteredTotalExpensesByDate[category] || {},
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
        data: totalData,
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
    labels: Object.keys(categoryDatasets[0]?.data || {}),
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
      <header className='App-header'>
        <Typography variant="h5">Splitwise Expense Data Visulization</Typography>
        <Input
          type="file"
          onChange={handleFileUpload}
          inputProps={{ accept: ".csv", multiple: false }}
        />
        <Grid container spacing={3} alignItems="center" style={{ marginTop: '20px' }}>
          <Grid item xs={12} md={3}>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date || undefined)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Start Date"
              className="form-control"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date || undefined)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              placeholderText="End Date"
              className="form-control"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel htmlFor="granularity">Select Granularity</InputLabel>
              <Select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as string)}
                input={<Input id="granularity" />}
              >
                <MenuItem value={'default'}>Default</MenuItem>
                <MenuItem value={'weekly'}>Weekly</MenuItem>
                <MenuItem value={'monthly'}>Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </header>

      <body>
        {(selectedCategories.size > 0 || showTotal) && (
          <Grid container spacing={3} style={{ marginTop: '20px' }}>
            <Grid item xs={12}>
              <div style={{ width: '80%', margin: 'auto auto' }}>
                <Line data={lineChartData} options={{ maintainAspectRatio: false }} height={300} />
              </div>
            </Grid>
          </Grid>
        )}

        {expensesByCategory.length > 0 && (
          <Grid container style={{ marginTop: '20px' }}>
            <Grid item xs={12}>
              <div style={{ width: '80%', margin: 'auto auto' }}>
                <TableContainer component={Paper} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell>Total Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow key="TOTAL">
                        <TableCell>
                          <FormGroup>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={showTotal}
                                  onChange={handleTotalCheckboxChange}
                                />
                              }
                              label="TOTAL"
                            />
                          </FormGroup>
                        </TableCell>
                        <TableCell>
                          {Object.values(expenses).reduce((acc, categoryExpenses) => {
                            return acc + Object.values(categoryExpenses).reduce((acc, curr) => acc + curr, 0);
                          }, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {expensesByCategory.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <FormGroup>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={selectedCategories.has(item.category)}
                                    onChange={() => handleCheckboxChange(item.category)}
                                  />
                                }
                                label={item.category}
                              />
                            </FormGroup>
                          </TableCell>
                          <TableCell>{item.totalCost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </Grid>
          </Grid>
        )}</body>

    </div>
  );
};

export default App;
