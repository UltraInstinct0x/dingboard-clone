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
    const tooltipTexts = {
        "segment": "Click this then click on the part that you want to segment.", 
        "rmbg": "Click then wait until a slider appears that allows you to remove background.",
        "delete": "Delete element/s",
        "group": "Groups elements",
        "ungroup": "Ungroups elements",
    }
    return (
        <>
            <div className="absolute flex flex-col" style={{top: top, left: left}}>
                <Button id="segment" Icon={SlPuzzle} isActive={isSegment===true} onClick={handleSegment} shortcut="s" tooltipText={tooltipTexts["segment"]}/>
                <Button id="rmbg" Icon={TbBackground} isActive={isRmbg===true} onClick={handleRmbg} shortcut="r" tooltipText={tooltipTexts["rmbg"]}/>
                <Button id="delete" Icon={SlTrash}  onClick={handleDelete} shortcut="Backspace" tooltipText={tooltipTexts["delete"]}/>
                <Button id="group" Icon={FaRegObjectGroup} onClick={handleGroup} shortcut="g" tooltipText={tooltipTexts["group"]}/>
                <Button id="ungroup" Icon={FaRegObjectUngroup} onClick={handleUngroup} shortcut="u" tooltipText={tooltipTexts["ungroup"]}/>
            </div>
            //slider
            <div className={`${isRmbg ? "visible"  : "invisible"} absolute flex`} style={{top: topSlider, left: leftSlider}}>
                <input type="range" min="0" max="100" value={rmbgSliderValue} onChange={handleRmbgSlider} />
            </div>
        </>
    )
}
