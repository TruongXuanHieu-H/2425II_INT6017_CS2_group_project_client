import React from 'react';
import ImageUpload from './components/ImageUpload';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Image Upload Application</h1>
      </header>
      <main>
        <ImageUpload />
      </main>
    </div>
  );
}

export default App;