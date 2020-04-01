import { Spreadsheet } from '../base/index';
import { applyMerge, activeCellMergedRange, MergeArgs } from '../../workbook/common/index';
import { ICellRenderer, hiddenMerge, dialog, locale, CellRenderArgs, checkPrevMerge } from '../common/index';
import { Dialog } from '../services/index';
import { CellModel, getCell, SheetModel, isHiddenCol, isHiddenRow } from '../../workbook/index';
import { L10n } from '@syncfusion/ej2-base';

/**
 * The `Merge` module is used to to merge the range of cells.
 */
export class Merge {
    private parent: Spreadsheet;
    /**
     * Constructor for the Spreadsheet merge module.
     * @private
     */
    constructor(parent: Spreadsheet) {
        this.parent = parent;
        this.addEventListener();
    }
    private merge(args: { rowIdx?: number, colIdx?: number, showDialog?: boolean }): void {
        if (args.showDialog) {
            (this.parent.serviceLocator.getService(dialog) as Dialog).show({
                target: this.parent.element,
                height: 180, width: 400, isModal: true, showCloseIcon: true,
                content: (this.parent.serviceLocator.getService(locale) as L10n).getConstant('PasteMergeAlert'),
                beforeOpen: (): void => this.parent.element.focus()
            });
            return;
        }
        (this.parent.serviceLocator.getService('cell') as ICellRenderer).refresh(args.rowIdx, args.colIdx);
    }
    private hideHandler(args: { rowIdx: number, colIdx: number, model: string, start: number, end: number, isEnd?: boolean,
        hide: boolean }): void {
        let sheet: SheetModel = this.parent.getActiveSheet();
        let mergeArgs: MergeArgs = { range: [args.rowIdx, args.colIdx, args.rowIdx, args.colIdx] };
        this.parent.notify(activeCellMergedRange, mergeArgs); mergeArgs.range = mergeArgs.range as number[];
        let endIdx: number;
        let cell: CellModel = getCell(mergeArgs.range[0], mergeArgs.range[1], sheet) || {};
        let startIdx: number = args.model === 'row' ? mergeArgs.range[0] : mergeArgs.range[1];
        endIdx = startIdx + ((cell[`${args.model}Span`] || 1) - 1);
        if ((!args.isEnd && (args.start === startIdx || isHiddenCol(sheet, startIdx))) || (args.isEnd && (args.start > startIdx &&
            !isHiddenCol(sheet, startIdx)))) { return; }
        if (cell[`${args.model}Span`] > 1 && endIdx >= args.start) {
            if (args.model === 'row' ? isHiddenRow(sheet, startIdx) : isHiddenCol(sheet, startIdx)) {
                if (args.end < endIdx && (endIdx - args.end > 1 || cell.rowSpan > 1)) {
                    let cellEle: HTMLTableCellElement = this.parent.getCell(args.rowIdx, args.end + 1) as HTMLTableCellElement;
                    if (cellEle) {
                        if (endIdx - args.end > 1) { cellEle.colSpan = endIdx - args.end; }
                        cellEle.style.display = '';
                    }
                    if (cell.rowSpan > 1) {
                        let rowSpan: number = cell.rowSpan - this.parent.hiddenCount(args.rowIdx, args.rowIdx + (cell.rowSpan - 1));
                        if (rowSpan > 1) { cellEle.rowSpan = rowSpan; }
                    }
                }
            } else {
                this.merge({ rowIdx: mergeArgs.range[0], colIdx: mergeArgs.range[1] });
            }
        }
    }
    private checkPrevMerge(args: CellRenderArgs): void {
        let cell: CellModel; let sheet: SheetModel = this.parent.getActiveSheet(); let mergeArgs: MergeArgs; let mergeCount: number;
        if (args.isRow) {
            if (args.rowIdx - 1 > -1 && isHiddenRow(sheet, args.rowIdx - 1)) {
                cell = getCell(args.rowIdx - 1, args.colIdx, sheet) || {};
                if ((cell.rowSpan !== undefined || cell.colSpan !== undefined) && (cell.colSpan === undefined || cell.colSpan > 1 ||
                    (args.colIdx - 1 > -1 && isHiddenCol(sheet, args.colIdx - 1)))) {
                    mergeArgs = { range: [args.rowIdx - 1, args.colIdx, args.rowIdx - 1, args.colIdx] };
                    this.parent.notify(activeCellMergedRange, mergeArgs); mergeArgs.range = mergeArgs.range as number[];
                    if (isHiddenRow(sheet, mergeArgs.range[0]) && mergeArgs.range[2] >= args.rowIdx) {
                        cell = getCell(mergeArgs.range[0], mergeArgs.range[1], sheet) || {};
                        if (cell.rowSpan > 1) {
                            mergeCount = (mergeArgs.range[2] - args.rowIdx) + 1 - this.parent.hiddenCount(
                                args.rowIdx, args.rowIdx + (mergeArgs.range[2] - args.rowIdx));
                            if (mergeCount > 1) {
                                args.td.rowSpan = mergeCount; args.td.style.display = '';
                            } else {
                                if (args.td.rowSpan) { args.td.removeAttribute('rowSpan'); }
                            }
                            if (cell.colSpan > 1 && !(args.colIdx - 1 > -1 && isHiddenCol(sheet, args.colIdx - 1))) {
                                mergeCount = cell.colSpan - this.parent.hiddenCount(
                                    args.colIdx, args.colIdx + (cell.colSpan - 1), 'columns');
                                if (mergeCount > 1) { args.td.colSpan = mergeCount; args.td.style.display = ''; }
                            }
                        }
                    }
                }
            }
            return;
        }
        if (args.colIdx - 1 > -1 && isHiddenCol(sheet, args.colIdx - 1)) {
            cell = getCell(args.rowIdx, args.colIdx - 1, sheet) || {};
            if ((cell.colSpan !== undefined || cell.rowSpan !== undefined) && (cell.rowSpan === undefined || cell.rowSpan > 1 ||
                (args.rowIdx - 1 > -1 && isHiddenRow(sheet, args.rowIdx - 1)))) {
                mergeArgs = { range: [args.rowIdx, args.colIdx - 1, args.rowIdx, args.colIdx - 1] };
                this.parent.notify(activeCellMergedRange, mergeArgs); mergeArgs.range = mergeArgs.range as number[];
                if (isHiddenCol(sheet, mergeArgs.range[1]) && mergeArgs.range[3] >= args.colIdx) {
                    cell = getCell(mergeArgs.range[0], mergeArgs.range[1], sheet) || {};
                    if (cell.colSpan > 1) {
                        mergeCount = (mergeArgs.range[3] - args.colIdx) + 1 - this.parent.hiddenCount(
                            args.colIdx, args.colIdx + (cell.colSpan - 1), 'columns');
                        if (mergeCount > 1) {
                            args.td.colSpan = mergeCount; args.td.style.display = '';
                        } else {
                            if (args.td.colSpan) { args.td.removeAttribute('colSpan'); }
                        }
                        if (cell.rowSpan > 1 && !(args.rowIdx - 1 > -1 && isHiddenRow(sheet, args.rowIdx - 1))) {
                            mergeCount = cell.rowSpan - this.parent.hiddenCount(args.rowIdx, args.rowIdx + (cell.rowSpan - 1));
                            if (mergeCount > 1) { args.td.rowSpan = mergeCount; args.td.style.display = ''; }
                        }
                    }
                }
            }
        }
    }
    private addEventListener(): void {
        this.parent.on(applyMerge, this.merge, this);
        this.parent.on(hiddenMerge, this.hideHandler, this);
        this.parent.on(checkPrevMerge, this.checkPrevMerge, this);
    }
    /**
     * Destroy merge module.
     */
    public destroy(): void {
        this.removeEventListener();
        this.parent = null;
    }
    private removeEventListener(): void {
        if (!this.parent.isDestroyed) {
            this.parent.off(applyMerge, this.merge);
            this.parent.off(hiddenMerge, this.hideHandler);
            this.parent.off(checkPrevMerge, this.checkPrevMerge);
        }
    }
    /**
     * Get the merge module name.
     */
    public getModuleName(): string {
        return 'merge';
    }
}