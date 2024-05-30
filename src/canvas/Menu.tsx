import { SlPuzzle, SlTrash } from "react-icons/sl";
import { TbBackground } from "react-icons/tb";
import { FaRegObjectGroup, FaRegObjectUngroup } from "react-icons/fa";
import { MenuProps } from "./interfaces";
import Button from "../common/Button";

export default function Menu({ top, left, handleDelete, handleGroup, handleUngroup, isSegment, handleSegment, handleRmbg, isRmbg, handleRmbgSlider, rmbgSliderValue}: MenuProps) {
    if (top == null || left == null) {
        return null;
    }
    const topSlider = top + 50;
    const leftSlider = left + 50;
    return (
        <>
            <div className="absolute flex" style={{top: top, left: left}}>
                <Button Icon={SlPuzzle} isActive={isSegment===true} onClick={handleSegment} />
                <Button Icon={TbBackground} isActive={isRmbg===true} onClick={handleRmbg}/>
                <Button Icon={SlTrash}  onClick={handleDelete}/>
                <Button Icon={FaRegObjectGroup} onClick={handleGroup}/>
                <Button Icon={FaRegObjectUngroup} onClick={handleUngroup}/>
            </div>
            //slider
            <div className={`${isRmbg ? "visible"  : "invisible"} absolute flex`} style={{top: topSlider, left: leftSlider}}>
                <input type="range" min="0" max="100" value={rmbgSliderValue} onChange={handleRmbgSlider} />
            </div>
        </>
    )
}
