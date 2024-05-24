import { SlPuzzle, SlTrash } from "react-icons/sl";
import { FaRegObjectGroup, FaRegObjectUngroup } from "react-icons/fa";
import { MenuProps } from "./interfaces";
import Button from "./Button";

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
