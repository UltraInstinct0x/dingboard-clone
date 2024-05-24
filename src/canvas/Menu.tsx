import { SlPuzzle, SlTrash } from "react-icons/sl";
import { FaRegObjectGroup, FaRegObjectUngroup } from "react-icons/fa";
import { MenuProps } from "./interfaces";
import Button from "../common/Button";

export default function Menu({ top, left, handleDelete, handleGroup, handleUngroup, isSegment, handleSegment }: MenuProps) {
    if (top == null || left == null) {
        return null;
    }
    return (
        <>
            <div className="absolute flex" style={{top: top, left: left}}>
                <Button Icon={SlPuzzle} isActive={isSegment===true} onClick={handleSegment} />
                <Button Icon={SlTrash}  onClick={handleDelete}/>
                <Button Icon={FaRegObjectGroup} onClick={handleGroup}/>
                <Button Icon={FaRegObjectUngroup} onClick={handleUngroup}/>
            </div>
        </>
    )
}
