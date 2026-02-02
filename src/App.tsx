import './App.css'
import Button from './components/Button'
import Title from './components/Title'

function App() {

  return (
    <div className="mt-4">
      <section className='flex justify-around items-center'>
        <Button variant="primary">Load Music</Button>
        <Title text="Music Title will go here"/>
        <div className='flex gap-5'>
          <Button variant="secondary">Import</Button>
          <Button variant="secondary">Export</Button>
        </div>
      </section>
      <section>
        
      </section>
    </div>
  )
}

export default App
