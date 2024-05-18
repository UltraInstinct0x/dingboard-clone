import { useState } from "react";
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

export default function Menu({image}) {

    const [top, setTop] = useState(null);
    const [left, setLeft] = useState(null);

    console.log(image);
    if (!image) {
        return null;
    }

    return (
        <>
            <div className="absolute z-10">
                <Button Icon={SlPuzzle} onClick={() => { console.log('clicked') }} />
                <Button Icon={SlTrash} />
                <Button Icon={BsEraser} />
            </div>
        </>
    )
}
