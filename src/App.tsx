import React from 'react';                                                                 
                                 
import './App.css'
const App: React.FC = () => {      
  const [numLines, setNumLines] = React.useState<number>(0);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {               
    const file = event.target.files && event.target.files[0];                              
    if (file) {                                                                            
      // Process the uploaded file here                                                    
      console.log('Uploaded file:', file);  
      
      const reader = new FileReader();                                                         
      reader.onload = () => {                                                                  
        const lines = reader.result?.toString().split('\n').length;                            
        if (lines) {                                                                           
          setNumLines(lines);                                                                  
        }                                                                                      
      };                                                                                       
      reader.readAsText(file);                                                                 
    }                                                                                      
  };      

  const handleSubmit = (event: React.FormEvent) => {                                           
    event.preventDefault();                                                                    
    console.log('Number of lines:', numLines);                                                 
  };                                                                                       
                                                                                           
  return (                                                                                 
    <div className='App'>  
      <header className="App-header">
        <p>Upload CSV File From Splitwise Export</p>                                                             
        <form onSubmit={handleSubmit}>
          <input type="file" accept=".csv" onChange={handleFileUpload} />    
          <button type="submit">Submit</button>                
        </form>   
      </header>                                                                           
    </div>      

  );                                                                                       
};                                                                                         
                                                                                           
export default App; 