export interface Page<T>{items:T[];total:number;page:number;limit:number}
export interface ProductDto{id:string;sku:string;name:string;description:string;unitPrice:string;minimumStock:number;active:boolean}
export interface WarehouseDto{id:string;code:string;name:string;active:boolean}
export interface StockDto{batchId:string;warehouseId:string;quantity:number;warehouse:WarehouseDto}
export interface BatchDto{id:string;companyId:string;code:string;receivedAt:string;product:ProductDto;supplier?:{name:string}|null;stock?:StockDto[];qrPayload?:string}
export interface EvidenceDto{id:string;batchId:string;sequence:number;status:"PENDING"|"PROCESSING"|"CONFIRMED"|"FAILED";payloadHash:string;evidenceHash:string|null;signature:string|null;createdAt:string;confirmedAt:string|null;canonicalPayload?:string;blockchain?:{network:string;programId:string}|null}
export interface DashboardDto{products:number;units:number;batches:number;lowStock:{id:string;sku:string;name:string;minimumStock:number;quantity:number}[]}
