import './App.css'
import Button from './components/Button'
import Title from './components/Title'
import Icon from './components/Icon'
import volume from './assets/volume.png'
import magnifier from './assets/zoom-in.png'
import next from './assets/forward-button.png'
import previous from './assets/rewind-button.png'
import play from './assets/play-button-arrowhead.png'
import pause from './assets/pause.png'
import stop from './assets/stop.png'

function App() {

  return (
    <div className="mt-4 p-4">
      <section className='flex justify-around items-center'>
        <Button variant="primary">Load Music</Button>
        <Title text="Music Title will go here"/>
        <div className='flex gap-5'>
          <Button variant="secondary">Import</Button>
          <Button variant="secondary">Export</Button>
        </div>
      </section>
      <section className='flex items-center justify-around'>
        <div className='border-2 w-[15%] h-12.5 mt-4 flex rounded-md'>
          <div className='border-r w-[50%] h-full p-4 flex justify-center items-center'>
            <p>100 Bpm</p>
          </div>
          <div className='border-l w-[50%] h-full p-4 flex justify-center items-center'>
            <p>4/4</p>
          </div>
        </div>
        <div className='border-2 w-[45%] h-12.5 mt-4 flex rounded-md'>
          <div className='flex items-center justify-center w-[40%] border-r-2'>
            <p>00:00:00</p>
          </div>
          <div className='flex items-center justify-around w-[55%]'>
            <Icon url={previous} className='cursor-pointer'/>
            <Icon url={pause} className='cursor-pointer'/>
            <Icon url={play} className='cursor-pointer'/>
            <Icon url={stop} className='cursor-pointer'/>
            <Icon url={next} className='cursor-pointer'/>
          </div>
        </div>
        <div className='w-[30%] h-12.5 mt-4 flex rounded-md items-center'>
          <div className='flex items-center gap-4 ml-2'>
            <Icon url={volume}/>
            <input type="range" min={0} max="100"  className="range" />
          </div>
          <div className='flex items-center gap-4 ml-2'>
            <Icon url={magnifier}/>
            <input type="range" min={0} max="100"  className="range" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
