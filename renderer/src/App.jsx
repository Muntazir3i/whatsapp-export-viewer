import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { useChats } from './hooks/useChats.js'
import './styles/global.css'
import { Sidebar } from './components/Sidebar/Sidebar.jsx'
import { ChatWindow } from './components/chat/ChatWindow.jsx'

function App() {
  const [selectedChatId, setSelectedChatId] = useState(null)
  
  
  return (
    <>
       <Sidebar setSelectedChatId = {setSelectedChatId} />
       <ChatWindow selectedChatId = {selectedChatId} /> 
    </>
  )
}

export default App
