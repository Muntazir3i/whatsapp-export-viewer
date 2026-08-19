import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { useChats } from './hooks/useChats.js'
import './styles/global.css'

function App() {
  
  return (
    <>
       <div className="flex min-h-screen items-center justify-center bg-gray-900">
            
            <p className='text-red-500 font-bold text-2xl'>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Pariatur quae exercitationem animi soluta perspiciatis at, minima eaque eligendi iure inventore quia nostrum, quis impedit corporis quidem delectus labore voluptatem officiis?
            </p>
        </div>
    </>
  )
}

export default App
