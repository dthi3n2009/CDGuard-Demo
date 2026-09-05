import React from 'react';
import catalog from '../data/vietnam-addresses.json';
import type { Garden } from '../types';

export type GardenAddress = Pick<Garden, 'province' | 'district' | 'ward' | 'provinceCode' | 'wardCode' | 'address'>;
export function isValidGardenAddress(value: GardenAddress): boolean {
  return !!catalog.provinces.find(p => p.code === value.provinceCode)?.wards.some(w => w.code === value.wardCode);
}

export function VietnamAddressFields({ value, onChange }: { value: GardenAddress; onChange: (value: GardenAddress) => void }) {
  const province = catalog.provinces.find(p => p.code === value.provinceCode || p.name === value.province);
  const control = 'w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900';
  return <div className="space-y-3 text-xs">
    {value.district && !value.wardCode && <p className="text-amber-800">Địa chỉ cũ: {value.district}, {value.province}. Hãy chọn lại xã/phường hiện nay khi cập nhật địa chỉ.</p>}
    <label className="block font-bold">Tỉnh / Thành phố
      <select aria-label="Tỉnh / Thành phố" required className={control} value={province?.code ?? ''} onChange={e => {
        const p = catalog.provinces.find(p => p.code === Number(e.target.value));
        onChange({ ...value, province: p?.name ?? '', provinceCode: p?.code, district: '', ward: '', wardCode: undefined });
      }}>
        <option value="">Chọn tỉnh / thành phố</option>
        {catalog.provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
      </select>
    </label>
    <label className="block font-bold">Xã / Phường / Đặc khu
      <select aria-label="Xã / Phường / Đặc khu" required disabled={!province} className={control} value={value.wardCode ?? ''} onChange={e => {
        const w = province?.wards.find(w => w.code === Number(e.target.value));
        onChange({ ...value, province: province?.name ?? '', provinceCode: province?.code, district: '', ward: w?.name ?? '', wardCode: w?.code });
      }}>
        <option value="">{province ? 'Chọn xã / phường / đặc khu' : 'Chọn tỉnh / thành phố trước'}</option>
        {province?.wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
      </select>
    </label>
    <label className="block font-bold">Địa chỉ chi tiết / Vị trí vườn
      <input aria-label="Địa chỉ chi tiết" className={control} value={value.address ?? ''} onChange={e => onChange({ ...value, address: e.target.value })} placeholder="Số nhà, đường, ấp/thôn, mốc gần vườn…" />
    </label>
    <p className="text-slate-500">Danh mục 34 tỉnh/thành, 3.321 xã/phường/đặc khu; tải ngày 05/09/2026 từ provinces.open-api.vn (dữ liệu sau sắp xếp 2025).</p>
  </div>;
}
