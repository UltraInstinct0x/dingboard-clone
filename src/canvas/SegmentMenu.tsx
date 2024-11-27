import Button from '../common/Button';
import { IoIosAddCircleOutline, IoIosRemoveCircleOutline, IoIosCheckboxOutline } from "react-icons/io";
//import { PiSelectionPlus } from "react-icons/pi";
import { SegmentMenuProps } from "./interfaces";

export default function SegmentMenu({top, left, angle, isSegment, isAddPositivePoint, handleIsAddPositivePoint, isAddNegativePoint, handleIsAddNegativePoint, handleSegment}: SegmentMenuProps) {
    if (!isSegment) return null;
    if (top === null || left === null || angle === null) return null;

    const tooltipTexts= {
        "positivePoint": "Adds a point where segmentation is desired",
        "negativePoint": "Adds a point where segmentation is not desired",
        "boundingBox": "Adds a bounding box where segmentation will be done, optional.",
        "start": "Segment!"
    }

    const getRelativePosition = (baseTop: number, baseLeft: number) => {
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Apply rotation to the relative position
        return {
            top: baseTop,
            left: baseLeft - (40 * sin), // Adjust horizontal position based on rotation (opposite direction from menu)
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'top left'
        };
    };

    const menuStyle = getRelativePosition(top, left);

    return (
        <div 
            className="absolute flex flex-col gap-1" 
            style={menuStyle}
        >
            <Button id="positivePoint" Icon={IoIosAddCircleOutline} isActive={isAddPositivePoint} onClick={handleIsAddPositivePoint} tooltipText={tooltipTexts["positivePoint"]} shortcut="p"/>
            <Button id="negativePoint" Icon={IoIosRemoveCircleOutline} isActive={isAddNegativePoint} onClick={handleIsAddNegativePoint} tooltipText={tooltipTexts["negativePoint"]} shortcut="n"/>
            {/*
            <Button id="boundingBox" Icon={PiSelectionPlus} tooltipText={tooltipTexts["boundingBox"]} shortcut="b"/>
            */}
            <Button id="start" Icon={IoIosCheckboxOutline} onClick={handleSegment} tooltipText={tooltipTexts["start"]} shortcut="Enter"/>
        </div>
    );
}
