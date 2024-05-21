import { useState, useEffect } from "react";
import { SlPuzzle, SlTrash, CiEraser } from "react-icons/sl";
import { BsEraser } from "react-icons/bs";

interface ButtonProps {
    Icon: React.ComponentType
    onClick?: () => void
}

function Button({ Icon, isActive, onClick}: ButtonProps) {

    return (
        <div className={`${isActive ? "bg-slate-900" : "bg-slate-700"} hover:bg-slate-800 active:bg-slate-700 py-1 px-1 rounded-none`} onClick={onClick}>
            <Icon />
        </div>
    )
}

export default function Menu({top, left, isSegment,  setIsSegment}) {
    if (top == null || left == null) {
        return null;
    }
    function onClick() {
        setIsSegment((prev) => !prev);
    }

    return (
        <>
            <div className="absolute flex" style={{top: top, left: left}}>
                <Button Icon={SlPuzzle} isActive={isSegment===true} onClick={onClick} />
                <Button Icon={SlTrash} />
                <Button Icon={BsEraser} />
            </div>
        </>
    )
}
