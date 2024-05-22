import { SlPuzzle, SlTrash } from "react-icons/sl";
import { FaRegObjectGroup, FaRegObjectUngroup } from "react-icons/fa";
import { MenuProps } from "./interfaces";

interface ButtonProps {
    Icon: React.ComponentType
    onClick: () => void
    isActive?: boolean
}

function Button({ Icon, isActive = false, onClick}: ButtonProps) {

    return (
        <div className={`${isActive ? "bg-slate-900" : "bg-slate-700"} hover:bg-slate-800 active:bg-slate-700 py-1 px-1 rounded-none`} onClick={onClick}>
            <Icon />
        </div>
    )
}

export default function Menu({ top, left, setDeleteSelection, setGroup, setUngroup, isSegment, setIsSegment }: MenuProps) {
    if (top == null || left == null) {
        return null;
    }
    function onClickSegment() {
        setIsSegment((prev) => !prev);
    }
    function onClickDelete() {
        setDeleteSelection(true);
    }
    function onClickGroup() {
        setGroup(true);
    }
    function onClickUngroup() {
        setUngroup(true);
    }

    return (
        <>
            <div className="absolute flex" style={{top: top, left: left}}>
                <Button Icon={SlPuzzle} isActive={isSegment===true} onClick={onClickSegment} />
                <Button Icon={SlTrash}  onClick={onClickDelete}/>
                <Button Icon={FaRegObjectGroup} onClick={onClickGroup}/>
                <Button Icon={FaRegObjectUngroup} onClick={onClickUngroup}/>
            </div>
        </>
    )
}
