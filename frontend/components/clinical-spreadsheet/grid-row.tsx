import React from "react";
import { SingleCellInput } from "./single-cell-input";
import { MultiItemSheetCell } from "./multi-item-sheet-cell";
import { NutritionSheetCell } from "./nutrition-sheet-cell";
import { VitalSignCell } from "./vital-sign-cell";
import { FluidRecord, CurrentUser, VitalSignRecord } from "./types";

type GridRowProps = {
  hour: string;
  rowIndex: number;
  fluidsByHourCategoryMap: Map<string, FluidRecord[]>;
  vitalsByHourMap: Map<string, VitalSignRecord>;
  savingMap: Record<string, boolean>;
  successMap: Record<string, boolean>;
  errorMap: Record<string, boolean>;
  currentUser: CurrentUser | null;
  isReadOnlyShift: boolean;
  handleAddMultiItemRecord: (hour: string, category: string, direction: "INPUT" | "OUTPUT", volumeRaw: string, notes: string) => Promise<void>;
  handleDeleteRecord: (recordId: number) => Promise<void>;
  handleUpdateRecord: (recordId: number, volumeRaw: string, notes: string) => Promise<void>;
  handleAddNutritionRecord: (hour: string, category: "ORAL_DIET" | "ENTERAL_DIET" | "PARENTERAL_NUTRITION" | "FILTERED_WATER", volumeMl: number, notes: string) => Promise<void>;
  handleFluidCellSave: (hour: string, category: string, direction: "INPUT" | "OUTPUT", valString: string) => Promise<void>;
  handleVitalCellSave: (hour: string, field: string, valString: string) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => void;
};

export default function GridRow({
  hour,
  rowIndex,
  fluidsByHourCategoryMap,
  vitalsByHourMap,
  savingMap,
  successMap,
  errorMap,
  currentUser,
  isReadOnlyShift,
  handleAddMultiItemRecord,
  handleDeleteRecord,
  handleUpdateRecord,
  handleAddNutritionRecord,
  handleFluidCellSave,
  handleVitalCellSave,
  handleKeyDown,
}: GridRowProps) {
  const medsList = fluidsByHourCategoryMap.get(`${hour}-MEDICATION`) || [];
  const otherInputList = fluidsByHourCategoryMap.get(`${hour}-OTHER_INPUT`) || [];
  const nutritionList = [
    ...(fluidsByHourCategoryMap.get(`${hour}-ORAL_DIET`) || []),
    ...(fluidsByHourCategoryMap.get(`${hour}-ENTERAL_DIET`) || []),
    ...(fluidsByHourCategoryMap.get(`${hour}-PARENTERAL_NUTRITION`) || []),
    ...(fluidsByHourCategoryMap.get(`${hour}-FILTERED_WATER`) || []),
  ];
  const ivRecord = (fluidsByHourCategoryMap.get(`${hour}-IV_HYDRATION`) || [])[0];
  const urineRecord = (fluidsByHourCategoryMap.get(`${hour}-URINE`) || [])[0];
  const sneRecord = (fluidsByHourCategoryMap.get(`${hour}-SNE_SNG`) || [])[0];
  const drainList = fluidsByHourCategoryMap.get(`${hour}-DRAIN`) || [];
  const stoolList = fluidsByHourCategoryMap.get(`${hour}-STOOL`) || [];
  const otherOutputList = fluidsByHourCategoryMap.get(`${hour}-OTHER_OUTPUT`) || [];
  const vitalRecord = vitalsByHourMap.get(hour);

  return (
    <tr key={hour} className="h-7 hover:bg-slate-50/80 transition-colors print:h-auto print:hover:bg-transparent print:break-inside-avoid">
      <td className="p-0.5 text-center font-bold text-slate-700 bg-slate-100 border-r border-slate-200 print:bg-white print:text-black print:border-black print:h-auto print:align-top">
        {hour}
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <MultiItemSheetCell
          hour={hour}
          category="MEDICATION"
          direction="INPUT"
          title="Medicações & Infusões"
          records={medsList}
          currentUser={currentUser}
          isReadOnly={isReadOnlyShift}
          onAdd={handleAddMultiItemRecord}
          onDelete={handleDeleteRecord}
          onEdit={handleUpdateRecord}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <MultiItemSheetCell
          hour={hour}
          category="OTHER_INPUT"
          direction="INPUT"
          title="Outras Entradas Hídricas"
          records={otherInputList}
          currentUser={currentUser}
          isReadOnly={isReadOnlyShift}
          onAdd={handleAddMultiItemRecord}
          onDelete={handleDeleteRecord}
          onEdit={handleUpdateRecord}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <NutritionSheetCell
          hour={hour}
          records={nutritionList}
          isReadOnly={isReadOnlyShift}
          onAdd={handleAddNutritionRecord}
          onDelete={handleDeleteRecord}
        />
      </td>

      <td className="p-0 border-r-2 border-r-emerald-300 print:border-black print:h-auto print:align-top">
        <SingleCellInput
          hour={hour}
          category="IV_HYDRATION"
          direction="INPUT"
          colIndex={0}
          rowIndex={rowIndex}
          existingRecord={ivRecord}
          isSaving={savingMap[`fluid-${hour}-IV_HYDRATION`]}
          isSuccess={successMap[`fluid-${hour}-IV_HYDRATION`]}
          isError={errorMap[`fluid-${hour}-IV_HYDRATION`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleFluidCellSave}
          onKeyDown={handleKeyDown}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <SingleCellInput
          hour={hour}
          category="URINE"
          direction="OUTPUT"
          colIndex={1}
          rowIndex={rowIndex}
          existingRecord={urineRecord}
          isSaving={savingMap[`fluid-${hour}-URINE`]}
          isSuccess={successMap[`fluid-${hour}-URINE`]}
          isError={errorMap[`fluid-${hour}-URINE`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleFluidCellSave}
          onKeyDown={handleKeyDown}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <SingleCellInput
          hour={hour}
          category="SNE_SNG"
          direction="OUTPUT"
          colIndex={2}
          rowIndex={rowIndex}
          existingRecord={sneRecord}
          isSaving={savingMap[`fluid-${hour}-SNE_SNG`]}
          isSuccess={successMap[`fluid-${hour}-SNE_SNG`]}
          isError={errorMap[`fluid-${hour}-SNE_SNG`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleFluidCellSave}
          onKeyDown={handleKeyDown}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <MultiItemSheetCell
          hour={hour}
          category="DRAIN"
          direction="OUTPUT"
          title="Drenos"
          records={drainList}
          currentUser={currentUser}
          isReadOnly={isReadOnlyShift}
          volumeOptional
          onAdd={handleAddMultiItemRecord}
          onDelete={handleDeleteRecord}
          onEdit={handleUpdateRecord}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <MultiItemSheetCell
          hour={hour}
          category="STOOL"
          direction="OUTPUT"
          title="Fezes"
          records={stoolList}
          currentUser={currentUser}
          isReadOnly={isReadOnlyShift}
          volumeOptional
          onAdd={handleAddMultiItemRecord}
          onDelete={handleDeleteRecord}
          onEdit={handleUpdateRecord}
        />
      </td>

      <td className="p-0 border-r-2 border-r-rose-300 print:border-black print:h-auto print:align-top">
        <MultiItemSheetCell
          hour={hour}
          category="OTHER_OUTPUT"
          direction="OUTPUT"
          title="Outras Saídas Hídricas"
          records={otherOutputList}
          currentUser={currentUser}
          isReadOnly={isReadOnlyShift}
          volumeOptional
          onAdd={handleAddMultiItemRecord}
          onDelete={handleDeleteRecord}
          onEdit={handleUpdateRecord}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <VitalSignCell
          hour={hour}
          field="pulse"
          rowIndex={rowIndex}
          existingRecord={vitalRecord}
          isSaving={savingMap[`vital-${hour}-pulse`]}
          isSuccess={successMap[`vital-${hour}-pulse`]}
          isError={errorMap[`vital-${hour}-pulse`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleVitalCellSave}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <VitalSignCell
          hour={hour}
          field="blood_pressure"
          rowIndex={rowIndex}
          existingRecord={vitalRecord}
          isSaving={savingMap[`vital-${hour}-blood_pressure`]}
          isSuccess={successMap[`vital-${hour}-blood_pressure`]}
          isError={errorMap[`vital-${hour}-blood_pressure`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleVitalCellSave}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <VitalSignCell
          hour={hour}
          field="temperature"
          rowIndex={rowIndex}
          existingRecord={vitalRecord}
          isSaving={savingMap[`vital-${hour}-temperature`]}
          isSuccess={successMap[`vital-${hour}-temperature`]}
          isError={errorMap[`vital-${hour}-temperature`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleVitalCellSave}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <VitalSignCell
          hour={hour}
          field="respiration"
          rowIndex={rowIndex}
          existingRecord={vitalRecord}
          isSaving={savingMap[`vital-${hour}-respiration`]}
          isSuccess={successMap[`vital-${hour}-respiration`]}
          isError={errorMap[`vital-${hour}-respiration`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleVitalCellSave}
        />
      </td>

      <td className="p-0 border-r border-slate-200 print:border-black print:h-auto print:align-top">
        <VitalSignCell
          hour={hour}
          field="spo2"
          rowIndex={rowIndex}
          existingRecord={vitalRecord}
          isSaving={savingMap[`vital-${hour}-spo2`]}
          isSuccess={successMap[`vital-${hour}-spo2`]}
          isError={errorMap[`vital-${hour}-spo2`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleVitalCellSave}
        />
      </td>

      <td className="p-0 print:border-black print:h-auto print:align-top">
        <VitalSignCell
          hour={hour}
          field="hgt"
          rowIndex={rowIndex}
          existingRecord={vitalRecord}
          isSaving={savingMap[`vital-${hour}-hgt`]}
          isSuccess={successMap[`vital-${hour}-hgt`]}
          isError={errorMap[`vital-${hour}-hgt`]}
          isReadOnly={isReadOnlyShift}
          onSave={handleVitalCellSave}
        />
      </td>
    </tr>
  );
}
