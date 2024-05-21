import { useState, useEffect } from "react";
import { SlPuzzle, SlTrash, CiEraser } from "react-icons/sl";
import { BsEraser } from "react-icons/bs";

interface ButtonProps {
    Icon: React.ComponentType
    onClick?: () => void
}

function Button({ Icon, onClick}: ButtonProps) {
    return (
        <button className="bg-slate-700 hover:bg-slate-800 active:bg-slate-900 focus:bg-slate-800 py-1 px-1 focus:outline-slate-700 rounded-none" onClick={onClick}>
            <Icon />
        </button>
    )
}

export default function Menu({top, left}) {

    if (top == null || left == null) {
        return null;
    }

    return (
        <>
            <div className="absolute" style={{top: top, left: left}}>
                <Button Icon={SlPuzzle} onClick={() => { console.log('clicked') }} />
                <Button Icon={SlTrash} />
                <Button Icon={BsEraser} />
            </div>
        </>
    )
}
