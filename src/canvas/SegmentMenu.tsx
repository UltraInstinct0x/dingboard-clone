import Button from '../common/Button';
import { IoIosAddCircleOutline, IoIosRemoveCircleOutline, IoIosCheckboxOutline } from "react-icons/io";
//import { PiSelectionPlus } from "react-icons/pi";
import { SegmentMenuProps } from "./interfaces";

export default function SegmentMenu({top, left, isSegment, isAddPositivePoint, handleIsAddPositivePoint, isAddNegativePoint, handleIsAddNegativePoint, handleSegment}: SegmentMenuProps) {
    if (!isSegment) return null;
    if (top === null || left === null) return null;

    const tooltipTexts= {
        "positivePoint": "Adds a point where segmentation is desired",
        "negativePoint": "Adds a point where segmentation is not desired",
        "boundingBox": "Adds a bounding box where segmentation will be done, optional.",
        "start": "Segment!"
    }

    return (
        <div className="absolute flex flex-col" style={{top: top, left: left}}>
            <Button id="positivePoint" Icon={IoIosAddCircleOutline} isActive={isAddPositivePoint} onClick={handleIsAddPositivePoint} tooltipText={tooltipTexts["positivePoint"]} shortcut="p"/>
            <Button id="negativePoint" Icon={IoIosRemoveCircleOutline} isActive={isAddNegativePoint} onClick={handleIsAddNegativePoint} tooltipText={tooltipTexts["negativePoint"]} shortcut="n"/>
            {/*
            <Button id="boundingBox" Icon={PiSelectionPlus} tooltipText={tooltipTexts["boundingBox"]} shortcut="b"/>
            */}
            <Button id="start" Icon={IoIosCheckboxOutline} onClick={handleSegment} tooltipText={tooltipTexts["start"]} shortcut="Enter"/>
        </div>
        
    );
}
