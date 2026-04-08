import { ChangeDetectorRef, Component, Input, ViewChildren, QueryList, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { SearchService } from '../../../services/search-service';
import { ResultColumn, SearchPayload, SearchResult } from '@mau-arkiv/shared';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-form-component',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSelectModule],
  templateUrl: './form-component.html',
  styleUrl: './form-component.scss'
})
export class FormComponent implements AfterViewInit, OnChanges {
  @Input() form: any;
  formGroup: FormGroup;
  searchResult: SearchResult = { rows: [], totalCount: 0, page: 1, pageSize: 10 };
  searchState: 'not-started' | 'loading' | 'finished' = 'not-started';
  error = ''
  
  @ViewChildren('formInput') formInputs!: QueryList<ElementRef>;


  // Properties for Material table
  displayedColumns: string[] = [];

  pageSize = 25;
  pageIndex = 0;
  urlIndices: number[] = [];
  
  // Track current sorted column and its state (false = first click/orderbyOption, true = second click/orderbyOptionAlt)
  currentSortColumn: string | null = null;
  currentSortState: boolean = false;


  constructor(private fb: FormBuilder, private searchService: SearchService,
    private cdr: ChangeDetectorRef) {
    this.formGroup = this.fb.group({});
    console.log('FormComponent initialized with form:', this.form);
  }

  ngAfterViewInit() {
    this.setFocusToFirstInput();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('ngOnChanges called', changes);
    this.reset();
    if (this.form?.queryColumns) {
      // Dynamically add controls for each queryColumn
      this.form.queryColumns.forEach((col: any) => {
        if (!this.formGroup.contains(col.uid)) {
          this.formGroup.addControl(col.uid, this.fb.control(null));
        }
      });
    }
    // Set focus after view updates
    setTimeout(() => this.setFocusToFirstInput(), 0);
    
    // Set up display columns for the result table
    // if (this.form?.resultColumns) {
    //   this.urlIndices = this.form.resultColumns.filter((col: ResultColumn) => col.href).map((col: ResultColumn) => col.href);
    //   this.displayedColumns = this.form.resultColumns.filter((col: ResultColumn, index: number) => !this.urlIndices.includes(index));
    //   console.log('Display columns set to:', this.displayedColumns);
    // }
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.search();
  }

  onSearchSubmit(): void {
    this.pageIndex = 0;
    this.search();
  }

  search(): void {
    // const values = this.formGroup.value;
    if (!this.form?.uid) {
      console.error('Form UID is required for search');
      return;
    }

    const values = this.form.queryColumns.map((col: any) => { return { name: col.uid, value: this.formGroup.get(col.uid)?.value }; });

    // Get orderBy from the current sort state
    let orderByValue: string | undefined;
    let shouldSetDefaultSort = false;
    
    if (this.currentSortColumn) {
      const resultColumn = this.form?.resultColumns?.find((col: any) => col.dbName === this.currentSortColumn);
      
      if (resultColumn) {
        if (!this.currentSortState && resultColumn.orderByOption !== undefined) {
          // First click: use orderByOption
          orderByValue = this.form.orderBy?.options[resultColumn.orderByOption]?.value;
        } else if (this.currentSortState && resultColumn.orderByOptionAlt !== undefined) {
          // Second click: use orderByOptionAlt
          orderByValue = this.form.orderBy?.options[resultColumn.orderByOptionAlt]?.value;
        }
      }
    }
    
    // Fallback to default if no column is sorted
    if (!orderByValue && this.form.orderBy?.defaultOption !== undefined) {
      orderByValue = this.form.orderBy.options[this.form.orderBy.defaultOption]?.value;
      shouldSetDefaultSort = true; // Flag to set sort indicator after data loads
    }

    // Create SearchPayload instance where formGroup.value maps to params
    const searchPayload: SearchPayload = {
      formId: this.form.uid,
      params: values,
      orderBy: orderByValue,
      page: this.pageIndex + 1, // API usually expects 1-based page numbers
      pageSize: this.pageSize
    };

    console.log('Search payload:', searchPayload);

    this.searchState = 'loading';
    this.searchService.search(this.form.uid, searchPayload).subscribe({next: (results) => {
        this.searchResult = results;
        

        // // If no resultColumns defined or mismatch, auto-generate from data
        // if (!this.form?.resultColumns || results.rows.length > 0) {

        const dataKeys = results.rows.length > 0 ? Object.keys(results.rows[0]) : [];
            // Set up display columns for the result table
        if (this.form?.resultColumns) {
          this.urlIndices = this.form.resultColumns.filter((col: ResultColumn) => col.href).map((col: ResultColumn) => col.href);
          console.log('URL Indices:', this.urlIndices);
          this.form.resultColumns.forEach((col: ResultColumn, index: number) => {
            col.dbName = dataKeys[index];
          });

          console.log('Result columns after setting dbName:', this.form.resultColumns);
          
          this.displayedColumns = this.form.resultColumns
            .filter((col: ResultColumn, index: number) => !this.urlIndices.includes(index)).map((col: ResultColumn) => col.dbName);
          
          // Set the currentSortColumn to match the default orderBy option after dbName is populated
          if (shouldSetDefaultSort) {
            const defaultColumn = this.form.resultColumns.find((col: any) => 
              col.orderByOption === this.form.orderBy.defaultOption
            );
            
            if (defaultColumn && defaultColumn.dbName) {
              this.currentSortColumn = defaultColumn.dbName;
              this.currentSortState = false; // Default uses orderByOption (first click state)
            }
          }
        }

        this.searchState = 'finished';
        this.cdr.detectChanges()
        console.log('Search results:', results);
        console.log('Final displayed columns:', this.displayedColumns);
      },
      error: (error) => {
        console.error('Search error:', error);
        this.error = 'Ett fel uppstod vid sökning. Försök igen senare.';
        this.searchState = 'finished';
        this.cdr.detectChanges();
      }
    });
  }

  reset(): void {
    this.formGroup.reset();
    this.pageIndex = 0;
    this.pageSize = 25;
    this.searchResult = { rows: [], totalCount: 0, page: 1, pageSize: 10 };
    this.error = '';
    this.currentSortColumn = null;
    this.currentSortState = false;
    this.searchState = 'not-started';
  }

  getColumnTitle(columnId: string): string {
    // Try to find the column in resultColumns first
    const resultColumn = this.form?.resultColumns?.find((col: any) => col.dbName === columnId);
    if (resultColumn) {
      return resultColumn.title;
    }
    
    // Fallback to formatted columnId
    return this.formatColumnTitle(columnId);
  }

  isLinkColumn(columnId: string): boolean {
    const resultColumn = this.form?.resultColumns?.find((col: any) => col.dbName === columnId);
    return resultColumn?.href;
  }

  private formatColumnTitle(columnId: string): string {
    // Convert camelCase or snake_case to readable format
    return columnId
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  getHref(columnId: string, row:any): string | null {
    const index = this.form?.resultColumns?.find((col: any) => col.dbName === columnId)?.href;
    console.log('Href index for column', columnId, ':', index);

    if (index !== undefined && index >= 0) {
      const columnName = this.form?.resultColumns[index]?.dbName;
      console.log('Href column name:', columnName);

      return row[columnName]; // Use the provided row for href
    }
       
    return null;
  }

  isSortableColumn(columnId: string): boolean {
    const resultColumn = this.form?.resultColumns?.find((col: any) => col.dbName === columnId);
    console.log('Result column',  resultColumn);
    return resultColumn?.orderByOption !== undefined;
  }

  onColumnHeaderClick(columnId: string): void {
    const resultColumn = this.form?.resultColumns?.find((col: any) => col.dbName === columnId);
    
    if (!resultColumn || resultColumn.orderByOption === undefined) {
      return; // Column is not sortable
    }

    // Determine if this is the same column or a different one
    if (this.currentSortColumn === columnId) {
      // Same column - toggle state
      this.currentSortState = !this.currentSortState;
    } else {
      // Different column - reset to first click state
      this.currentSortColumn = columnId;
      this.currentSortState = false;
    }
    
    // Reset page to first page when sorting changes
    this.pageIndex = 0;
    
    // Trigger new search with updated orderBy
    this.search();
  }

  getSortIndicator(columnId: string): string {
    const resultColumn = this.form?.resultColumns?.find((col: any) => col.dbName === columnId);
    
    if (!resultColumn || resultColumn.orderByOption === undefined) {
      return ''; // Not sortable
    }

    // Only show indicator if this is the currently sorted column
    if (this.currentSortColumn !== columnId) {
      return ''; // Not currently sorted by this column
    }
    
    // Show indicator based on current state
    if (!this.currentSortState) {
      return '↑'; // First click - ascending
    } else {
      return '↓'; // Second click - descending
    }
  }

  private setFocusToFirstInput(): void {
    if (this.formInputs && this.formInputs.length > 0) {
      const firstInput = this.formInputs.first;
      console.log('First input:', firstInput);
      if (firstInput?.nativeElement) {
        firstInput.nativeElement.focus();
        console.log('Focus set on first input');
      }
    }
  }
}
