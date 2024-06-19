import React from 'react';                                                                 
                                 
import './App.css'
const App: React.FC = () => {                                                              
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {               
    const file = event.target.files && event.target.files[0];                              
    if (file) {                                                                            
      // Process the uploaded file here                                                    
      console.log('Uploaded file:', file);                                                 
    }                                                                                      
  };                                                                                       
                                                                                           
  return (                                                                                 
    <div className='App'>  
      <header className="App-header">
        <p>Upload CSV File From Splitwise Export</p>                                                             
        <form>                                                                               
          <input type="file" accept=".csv" onChange={handleFileUpload} />                    
        </form>   
      </header>                                                                           
    </div>      

  );                                                                                       
};                                                                                         
                                                                                           
export default App; 