import React from 'react'
import { useChats } from '../../hooks/useChats.js'
export const Sidebar = () => {
    const {chats, loading, error} = useChats()
    console.log(chats);
    console.log(loading);
    console.log(error);
    

    return (
        <aside id="default-sidebar" className="fixed top-0 left-0 z-40 w-64 h-full transition-transform -translate-x-full sm:translate-x-0" aria-label="Sidebar" >
            <div className="h-full px-3 py-4 overflow-y-auto bg-neutral-primary-soft border-e border-default">
                {chats.map(element => (
                  <li>{element.name}</li>  
                ))}
            </div>
        </aside>
    )
}
