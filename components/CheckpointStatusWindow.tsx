
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AddEventFunction } from '../App';
import type { Event as EventType } from './LiveEventStream';


// --- Configuration & Data ---

type LaneStatus = 'low' | 'medium' | 'high' | 'closed';
type LaneType = 'entry' | 'exit';
type VehicleType = 'car' | 'truck' | 'bus/minibus';

interface Lane {
  id: string; // Unique ID like 'E1', 'X1'
  displayId: string; // Number to show in UI
  type: LaneType;
  status: LaneStatus;
  vehicleType: VehicleType;
  waitTime?: string;
  vehiclesAtBorder?: number;
  vehiclesAtCustoms?: number;
}

interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  arrivedAt: string; // ISO string
  laneId: string;
  country: string;
  riskScore: number;
  riskBand: 'low' | 'medium' | 'high';
}

interface Declaration {
  id: string;
  mrn: string;
  traderName: string;
  hsCode: string;
  originCountry: string;
  value: number;
  riskScore: number;
  riskBand: 'low' | 'medium' | 'high';
  selectivity: 'GREEN' | 'YELLOW' | 'RED';
}

// Define data structure for a BCP
interface BCPData {
  lanes: Lane[];
  summary: {
    carsWait: string;
    trucksWait: string;
  };
  vehicles: Vehicle[];
  declarations: Declaration[];
}

// Mock data for different BCPs
export const BCP_DATA: Record<string, BCPData> = {
  'San Ysidro BCP': {
    summary: { carsWait: '45 min', trucksWait: 'N/A' },
    lanes: [
      { id: 'SYE1', displayId: '1', type: 'entry', vehicleType: 'car', status: 'high', waitTime: '45 min', vehiclesAtBorder: 3, vehiclesAtCustoms: 5 },
      { id: 'SYE2', displayId: '2', type: 'entry', vehicleType: 'car', status: 'high', waitTime: '42 min', vehiclesAtBorder: 4, vehiclesAtCustoms: 4 },
      { id: 'SYE3', displayId: '3', type: 'entry', vehicleType: 'car', status: 'medium', waitTime: '30 min', vehiclesAtBorder: 2, vehiclesAtCustoms: 3 },
      { id: 'SYE4', displayId: '4', type: 'entry', vehicleType: 'car', status: 'low' },
      { id: 'SYE5', displayId: '5', type: 'entry', vehicleType: 'bus/minibus', status: 'medium', waitTime: '20 min', vehiclesAtBorder: 1, vehiclesAtCustoms: 2 },
      { id: 'SYE6', displayId: '6', type: 'entry', vehicleType: 'car', status: 'closed' },
      { id: 'SYX1', displayId: '1', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'SYX2', displayId: '2', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'SYX3', displayId: '3', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'SYX4', displayId: '4', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'SYX5', displayId: '5', type: 'exit', vehicleType: 'bus/minibus', status: 'closed' },
      { id: 'SYX6', displayId: '6', type: 'exit', vehicleType: 'car', status: 'low' },
    ],
    vehicles: [
      { id: 'SYV1', plate: 'XY-84-112', type: 'car', arrivedAt: new Date(Date.now() - 2 * 60000).toISOString(), laneId: 'SYE1', country: 'XY', riskScore: 82, riskBand: 'high' },
      { id: 'SYV2', plate: 'KA-31-987', type: 'car', arrivedAt: new Date(Date.now() - 5 * 60000).toISOString(), laneId: 'SYE2', country: 'KA', riskScore: 45, riskBand: 'medium' },
      { id: 'SYV3', plate: 'NB-23-456', type: 'bus/minibus', arrivedAt: new Date(Date.now() - 8 * 60000).toISOString(), laneId: 'SYE5', country: 'NB', riskScore: 15, riskBand: 'low' },
      { id: 'SYV4', plate: 'ZT-55-321', type: 'car', arrivedAt: new Date(Date.now() - 12 * 60000).toISOString(), laneId: 'SYE3', country: 'ZT', riskScore: 68, riskBand: 'medium' },
    ],
    declarations: [
      { id: 'SYD1', mrn: 'KA123456', traderName: 'Alpha Trade Corp', hsCode: '8517', originCountry: 'ZT', value: 25000, riskScore: 75, riskBand: 'high', selectivity: 'RED' },
      { id: 'SYD2', mrn: 'KA654321', traderName: 'Borderline Logistics', hsCode: '2203', originCountry: 'KA', value: 12000, riskScore: 35, riskBand: 'medium', selectivity: 'YELLOW' },
      { id: 'SYD3', mrn: 'KA987654', traderName: 'Nistru Demo Cargo', hsCode: '6403', originCountry: 'NB', value: 45000, riskScore: 22, riskBand: 'low', selectivity: 'GREEN' },
      { id: 'SYD4', mrn: 'KA112233', traderName: 'Delta Freight Union', hsCode: '2710', originCountry: 'QR', value: 78000, riskScore: 88, riskBand: 'high', selectivity: 'RED' },
    ]
  },
  'Otay Mesa BCP': {
    summary: { carsWait: '25 min', trucksWait: '60 min' },
    lanes: [
      { id: 'OME1', displayId: '1', type: 'entry', vehicleType: 'car', status: 'medium', waitTime: '25 min', vehiclesAtBorder: 2, vehiclesAtCustoms: 2 },
      { id: 'OME2', displayId: '2', type: 'entry', vehicleType: 'car', status: 'low' },
      { id: 'OME3', displayId: '3', type: 'entry', vehicleType: 'truck', status: 'high', waitTime: '60 min', vehiclesAtBorder: 1, vehiclesAtCustoms: 4 },
      { id: 'OME4', displayId: '4', type: 'entry', vehicleType: 'truck', status: 'high', waitTime: '55 min', vehiclesAtBorder: 2, vehiclesAtCustoms: 3 },
      { id: 'OME5', displayId: '5', type: 'entry', vehicleType: 'bus/minibus', status: 'low' },
      { id: 'OME6', displayId: '6', type: 'entry', vehicleType: 'car', status: 'low' },
      { id: 'OMX1', displayId: '1', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'OMX2', displayId: '2', type: 'exit', vehicleType: 'truck', status: 'low' },
      { id: 'OMX3', displayId: '3', type: 'exit', vehicleType: 'truck', status: 'medium', waitTime: '15 min', vehiclesAtBorder: 1, vehiclesAtCustoms: 1 },
      { id: 'OMX4', displayId: '4', type: 'exit', vehicleType: 'car', status: 'closed' },
      { id: 'OMX5', displayId: '5', type: 'exit', vehicleType: 'bus/minibus', status: 'closed' },
      { id: 'OMX6', displayId: '6', type: 'exit', vehicleType: 'truck', status: 'low' },
    ],
    vehicles: [
      { id: 'OMV1', plate: 'QR-77-543', type: 'truck', arrivedAt: new Date(Date.now() - 3 * 60000).toISOString(), laneId: 'OME3', country: 'QR', riskScore: 91, riskBand: 'high' },
      { id: 'OMV2', plate: 'NB-19-882', type: 'car', arrivedAt: new Date(Date.now() - 7 * 60000).toISOString(), laneId: 'OME1', country: 'NB', riskScore: 25, riskBand: 'low' },
      { id: 'OMV3', plate: 'XY-42-109', type: 'truck', arrivedAt: new Date(Date.now() - 11 * 60000).toISOString(), laneId: 'OME4', country: 'XY', riskScore: 76, riskBand: 'high' },
    ],
    declarations: [
      { id: 'OMD1', mrn: 'NB123456', traderName: 'Alpha Trade Corp', hsCode: '2402', originCountry: 'ZT', value: 55000, riskScore: 95, riskBand: 'high', selectivity: 'RED' },
      { id: 'OMD2', mrn: 'NB654321', traderName: 'Delta Freight Union', hsCode: '3004', originCountry: 'XY', value: 32000, riskScore: 55, riskBand: 'medium', selectivity: 'YELLOW' },
      { id: 'OMD3', mrn: 'NB987654', traderName: 'Nistru Demo Cargo', hsCode: '2710', originCountry: 'NB', value: 61000, riskScore: 81, riskBand: 'high', selectivity: 'RED' },
      { id: 'OMD4', mrn: 'NB112233', traderName: 'Borderline Logistics', hsCode: '8517', originCountry: 'KA', value: 18000, riskScore: 41, riskBand: 'medium', selectivity: 'YELLOW' },
      { id: 'OMD5', mrn: 'NB445566', traderName: 'Alpha Trade Corp', hsCode: '2203', originCountry: 'QR', value: 8000, riskScore: 18, riskBand: 'low', selectivity: 'GREEN' },
      { id: 'OMD6', mrn: 'NB778899', traderName: 'Delta Freight Union', hsCode: '6403', originCountry: 'ZT', value: 21000, riskScore: 68, riskBand: 'medium', selectivity: 'RED' },
    ],
  },
  'Tecate BCP': {
    summary: { carsWait: '10 min', trucksWait: '20 min' },
    lanes: [
      { id: 'TCE1', displayId: '1', type: 'entry', vehicleType: 'car', status: 'low' },
      { id: 'TCE2', displayId: '2', type: 'entry', vehicleType: 'car', status: 'medium', waitTime: '10 min', vehiclesAtBorder: 1, vehiclesAtCustoms: 1 },
      { id: 'TCE3', displayId: '3', type: 'entry', vehicleType: 'truck', status: 'low' },
      { id: 'TCE4', displayId: '4', type: 'entry', vehicleType: 'car', status: 'low' },
      { id: 'TCE5', displayId: '5', type: 'entry', vehicleType: 'bus/minibus', status: 'closed' },
      { id: 'TCE6', displayId: '6', type: 'entry', vehicleType: 'truck', status: 'medium', waitTime: '20 min', vehiclesAtBorder: 1, vehiclesAtCustoms: 2 },
      { id: 'TCX1', displayId: '1', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'TCX2', displayId: '2', type: 'exit', vehicleType: 'truck', status: 'low' },
      { id: 'TCX3', displayId: '3', type: 'exit', vehicleType: 'car', status: 'low' },
      { id: 'TCX4', displayId: '4', type: 'exit', vehicleType: 'car', status: 'closed' },
      { id: 'TCX5', displayId: '5', type: 'exit', vehicleType: 'bus/minibus', status: 'low' },
      { id: 'TCX6', displayId: '6', type: 'exit', vehicleType: 'truck', status: 'low' },
    ],
    vehicles: [
      { id: 'TCV1', plate: 'KA-01-223', type: 'car', arrivedAt: new Date(Date.now() - 4 * 60000).toISOString(), laneId: 'TCE2', country: 'KA', riskScore: 33, riskBand: 'medium' },
      { id: 'TCV2', plate: 'ZT-64-781', type: 'truck', arrivedAt: new Date(Date.now() - 9 * 60000).toISOString(), laneId: 'TCE6', country: 'ZT', riskScore: 52, riskBand: 'medium' },
    ],
    declarations: [
      { id: 'TCD1', mrn: 'ZT123456', traderName: 'Nistru Demo Cargo', hsCode: '2710', originCountry: 'NB', value: 92000, riskScore: 65, riskBand: 'medium', selectivity: 'YELLOW' },
      { id: 'TCD2', mrn: 'ZT654321', traderName: 'Alpha Trade Corp', hsCode: '6403', originCountry: 'KA', value: 15000, riskScore: 28, riskBand: 'low', selectivity: 'GREEN' },
    ],
  }
};


const STATUS_CONFIG: { [key in LaneStatus]: { style: string; text: string; legendColor: string; capacity: number; fillColor: string; } } = {
  low: {
    style: 'bg-cyan-400/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(8,247,254,0.6)]',
    text: 'Low Traffic',
    legendColor: 'bg-cyan-400 shadow-cyan-400/50',
    capacity: 100,
    fillColor: 'bg-cyan-400',
  },
  medium: {
    style: 'bg-yellow-400/20 border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]',
    text: 'Medium Traffic',
    legendColor: 'bg-yellow-400 shadow-yellow-400/50',
    capacity: 60,
    fillColor: 'bg-yellow-400',
  },
  high: {
    style: 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)]',
    text: 'High Traffic',
    legendColor: 'bg-red-500 shadow-red-500/50',
    capacity: 30,
    fillColor: 'bg-red-500',
  },
  closed: {
    style: 'bg-gray-600/20 border-gray-600/50 text-gray-400',
    text: 'Closed',
    legendColor: 'bg-gray-500 shadow-gray-500/50',
    capacity: 0,
    fillColor: 'bg-gray-600',
  },
};

const RISK_BAND_CONFIG: { [key in 'low' | 'medium' | 'high']: { style: string; text: string; } } = {
  low: {
    style: 'bg-cyan-500/20 text-cyan-300',
    text: 'LOW',
  },
  medium: {
    style: 'bg-yellow-500/20 text-yellow-300',
    text: 'MEDIUM',
  },
  high: {
    style: 'bg-red-500/20 text-red-400',
    text: 'HIGH',
  },
};

const SELECTIVITY_CONFIG: { [key in 'GREEN' | 'YELLOW' | 'RED']: { style: string; text: string; } } = {
  GREEN: {
    style: 'bg-green-500/20 text-green-400 border-green-500/50',
    text: 'GREEN',
  },
  YELLOW: {
    style: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    text: 'YELLOW',
  },
  RED: {
    style: 'bg-red-500/20 text-red-400 border-red-500/50',
    text: 'RED',
  },
};


const STATUS_FILTER_OPTIONS: Array<LaneStatus | 'all'> = ['all', 'low', 'medium', 'high', 'closed'];
const TYPE_FILTER_OPTIONS: Array<LaneType | 'all'> = ['all', 'entry', 'exit'];
const VEHICLE_TYPE_FILTER_OPTIONS: Array<VehicleType | 'all'> = ['all', 'car', 'truck', 'bus/minibus'];
const LANE_MAX_CAPACITY = 10; // Max vehicles a lane can hold in processing

const formatVehicleType = (type: VehicleType | 'all') => {
  if (type === 'bus/minibus') return 'Bus/Minibus';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// --- Child Components ---

const EntryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
  </svg>
);

const ExitIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
  </svg>
);

const BorderInspectionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

const CustomsInspectionIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07a2.25 2.25 0 01-2.25 2.25H5.92a2.25 2.25 0 01-2.25-2.25v-4.07m16.5 0a2.25 2.25 0 00-2.25-2.25H5.92a2.25 2.25 0 00-2.25 2.25m16.5 0v-4.07a2.25 2.25 0 00-2.25-2.25H5.92a2.25 2.25 0 00-2.25 2.25v4.07" />
    </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.375A2.25 2.25 0 001.125 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V9.75a1.125 1.125 0 011.125-1.125h1.5V6.75a2.25 2.25 0 012.25-2.25h6.375a2.25 2.25 0 012.25 2.25v1.5h1.5a1.125 1.125 0 011.125 1.125v7.5a1.125 1.125 0 01-1.125 1.125h-1.5m-17.25 0h1.5m14.25 0h1.5" />
  </svg>
);

const BusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m-3 3h12m-1.5-6h.008v.008H18V9m-3.75 0h.008v.008H14.25V9m-3.75 0h.008v.008H10.5V9m-3.75 0h.008v.008H6.75V9" />
  </svg>
);


interface LegendItemProps {
  colorClass: string;
  text: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ colorClass, text }) => (
  <div className="flex items-center space-x-2">
    <div className={`w-3 h-3 rounded-full ${colorClass} shadow-[0_0_8px_var(--tw-shadow-color)]`}></div>
    <span className="text-sm text-gray-300 font-medium">{text}</span>
  </div>
);

interface LaneIndicatorProps {
  lane: Lane;
  isUpdated: boolean;
  onViewHistory: () => void;
}

const LaneIndicator: React.FC<LaneIndicatorProps> = ({ lane, isUpdated, onViewHistory }) => {
  const config = STATUS_CONFIG[lane.status];
  const laneTypeDisplay = lane.type.charAt(0).toUpperCase() + lane.type.slice(1);
  const vehicleTypeDisplay = formatVehicleType(lane.vehicleType);
  const shortStatusText = { low: 'Low', medium: 'Med', high: 'High', closed: 'Closed' }[lane.status];

  const showDetailedView = lane.vehiclesAtBorder !== undefined && lane.vehiclesAtCustoms !== undefined;

  const VehicleIcon = {
    car: CarIcon,
    truck: TruckIcon,
    'bus/minibus': BusIcon,
  }[lane.vehicleType];
  
  const totalLoad = showDetailedView ? (lane.vehiclesAtBorder || 0) + (lane.vehiclesAtCustoms || 0) : null;

  const getLoadIndicator = () => {
    if (totalLoad === null) return null;

    const loadPercentage = (totalLoad / LANE_MAX_CAPACITY) * 100;
    
    let colorClass = 'text-cyan-300';
    if (loadPercentage >= 80) {
        colorClass = 'text-red-400';
    } else if (loadPercentage >= 50) {
        colorClass = 'text-yellow-300';
    }

    return (
        <div className={`text-xs font-mono font-bold ${colorClass}`}>
            Load: {totalLoad}/{LANE_MAX_CAPACITY}
        </div>
    );
  };

  return (
    <div
      className={`relative group flex flex-col justify-between p-2 rounded-lg border transition-all duration-300 h-24 cursor-pointer hover:scale-105 hover:brightness-110 ${config.style} ${isUpdated ? 'status-updated' : ''} ${lane.status === 'high' ? 'high-traffic-glow' : ''}`}
    >
       <button 
        onClick={(e) => {
          e.stopPropagation();
          onViewHistory();
        }}
        className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/30 text-gray-400 hover:bg-cyan-500/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        title="View Lane History"
        aria-label="View lane history"
      >
        <HistoryIcon className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {lane.type === 'entry' 
              ? <EntryIcon className="w-3 h-3" /> 
              : <ExitIcon className="w-3 h-3" />
          }
          <span className="font-bold text-lg leading-tight">{lane.displayId}</span>
        </div>
        <VehicleIcon className="w-5 h-5 opacity-70" />
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center w-full gap-1">
        {showDetailedView ? (
          <>
            <div className="flex items-end justify-center gap-2 text-xs">
              <div className="flex items-center gap-1" title="Vehicles at Border Inspection">
                <BorderInspectionIcon className="w-4 h-4" />
                <span className="font-mono text-sm">{lane.vehiclesAtBorder}</span>
              </div>
              <div className="flex items-center gap-1" title="Vehicles at Customs Inspection">
                <CustomsInspectionIcon className="w-4 h-4" />
                <span className="font-mono text-sm">{lane.vehiclesAtCustoms}</span>
              </div>
            </div>
            {getLoadIndicator()}
          </>
        ) : (
          <span className="text-sm uppercase font-mono tracking-tighter">{shortStatusText}</span>
        )}
      </div>

      <div className="w-full">
        <div className="relative w-full h-2 bg-black/30 rounded-full overflow-hidden border border-white/10">
            <div 
                className={`h-full rounded-full ${config.fillColor} transition-all duration-500 ease-in-out`}
                style={{ width: `${config.capacity}%` }}
                aria-hidden="true"
            />
        </div>
      </div>
      
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2
                      invisible opacity-0 group-hover:visible group-hover:opacity-100 
                      transition-all duration-300 scale-95 group-hover:scale-100
                      bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-20">
        <div className="text-sm text-white font-sans">
            <p className="font-bold text-base mb-1">{laneTypeDisplay} Lane {lane.displayId} ({vehicleTypeDisplay})</p>
            <p><span className="font-semibold text-gray-400">Status:</span> {config.text}</p>
            {lane.vehiclesAtBorder !== undefined && <p><span className="font-semibold text-gray-400">Border Inspection:</span> {lane.vehiclesAtBorder} vehicles</p>}
            {lane.vehiclesAtCustoms !== undefined && <p><span className="font-semibold text-gray-400">Customs Inspection:</span> {lane.vehiclesAtCustoms} vehicles</p>}
            {totalLoad !== null && <p><span className="font-semibold text-gray-400">Current Load:</span> {totalLoad} / {LANE_MAX_CAPACITY} vehicles</p>}
            <p><span className="font-semibold text-gray-400">Traffic Level:</span> {config.capacity}%</p>
            <p><span className="font-semibold text-gray-400">Wait Time:</span> {lane.waitTime || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

interface JointRiskAnalysisConsoleProps {
  vehicles: Vehicle[];
  declarations: Declaration[];
}

const analyzeRiskData = (vehicles: Vehicle[], declarations: Declaration[]) => {
    // Joint Situation Overview
    const totalVehicles = vehicles.length;
    const totalDeclarations = declarations.length;
    const highRiskVehicles = vehicles.filter(v => v.riskBand === 'high');
    const highRiskDeclarations = declarations.filter(d => d.riskBand === 'high' || d.selectivity === 'RED');

    const highRiskCount = highRiskVehicles.length + highRiskDeclarations.length;
    let alertLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL' = 'NORMAL';
    if (highRiskCount >= 10) alertLevel = 'CRITICAL';
    else if (highRiskCount >= 5) alertLevel = 'ELEVATED';

    // Border Guard Coordination View
    const laneRiskMap = new Map<string, { totalScore: number; count: number }>();
    vehicles.forEach(v => {
      const entry = laneRiskMap.get(v.laneId) || { totalScore: 0, count: 0 };
      entry.totalScore += v.riskScore;
      entry.count += 1;
      laneRiskMap.set(v.laneId, entry);
    });
    const avgRiskByLane = Array.from(laneRiskMap.entries()).map(([laneId, data]) => ({
      laneId,
      avgScore: Math.round(data.totalScore / data.count)
    })).sort((a, b) => b.avgScore - a.avgScore);

    // Customs Coordination View
    const dist = declarations.reduce((acc, d) => {
        acc[d.selectivity] = (acc[d.selectivity] || 0) + 1;
        return acc;
    }, {} as Record<'GREEN' | 'YELLOW' | 'RED', number>);
    const selectivityDistribution = { GREEN: dist.GREEN || 0, YELLOW: dist.YELLOW || 0, RED: dist.RED || 0 };

    const top5HighRiskDeclarations = highRiskDeclarations.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
    
    return {
        totalVehicles,
        totalDeclarations,
        highRiskVehicles,
        highRiskDeclarations,
        alertLevel,
        avgRiskByLane,
        selectivityDistribution,
        top5HighRiskDeclarations,
    };
};

const JointRiskAnalysisConsole: React.FC<JointRiskAnalysisConsoleProps> = ({ vehicles, declarations }) => {
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleType | 'all'>('all');

    const {
        totalVehicles,
        totalDeclarations,
        highRiskVehicles,
        highRiskDeclarations,
        alertLevel,
        avgRiskByLane,
        selectivityDistribution,
        top5HighRiskDeclarations,
    } = useMemo(() => analyzeRiskData(vehicles, declarations), [vehicles, declarations]);

    const alertConfig = {
        NORMAL: { text: 'NORMAL', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500' },
        ELEVATED: { text: 'ELEVATED', style: 'bg-yellow-500/20 text-yellow-300 border-yellow-500 high-traffic-glow' },
        CRITICAL: { text: 'CRITICAL', style: 'bg-red-500/20 text-red-400 border-red-500 high-traffic-glow' },
    };
    
    const top5HighRiskVehicles = useMemo(() => {
        return [...vehicles]
            .filter(v => vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 5);
    }, [vehicles, vehicleTypeFilter]);

    return (
        <div className="mt-6 border-t border-gray-800 pt-6">
            <h3 className="text-xl font-semibold text-gray-200 mb-4 text-center tracking-wider uppercase">
                Joint Risk Analysis Console
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1: Joint Overview */}
                <div className="bg-black/20 p-4 rounded-lg border border-gray-800">
                    <h4 className="font-bold text-cyan-400 mb-3 text-center">Joint Situation Overview</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center"><span>Total Vehicles in System:</span> <strong className="font-mono text-lg">{totalVehicles}</strong></div>
                        <div className="flex justify-between items-center"><span>Total Declarations:</span> <strong className="font-mono text-lg">{totalDeclarations}</strong></div>
                        <hr className="border-gray-700 my-2" />
                        <div className="flex justify-between items-center"><span>High-Risk Vehicles (Border):</span> <strong className="font-mono text-lg text-red-400">{highRiskVehicles.length}</strong></div>
                        <div className="flex justify-between items-center"><span>High-Risk/RED Declarations:</span> <strong className="font-mono text-lg text-red-400">{highRiskDeclarations.length}</strong></div>
                        <hr className="border-gray-700 my-2" />
                        <div className="text-center pt-2">
                            <span className="text-gray-400">Coordination Center Alert Level</span>
                            <div className={`mt-2 text-xl font-bold p-2 rounded-md border text-center ${alertConfig[alertLevel].style}`}>
                                {alertConfig[alertLevel].text}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Border Guard View */}
                <div className="bg-black/20 p-4 rounded-lg border border-gray-800">
                    <h4 className="font-bold text-cyan-400 mb-3 text-center">Border Guard Coordination View</h4>
                    <div>
                        <h5 className="text-sm text-gray-400 mb-2 font-semibold">Average Risk Score by Lane</h5>
                        {avgRiskByLane.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                                {avgRiskByLane.map(item => (
                                    <div key={item.laneId} className="bg-gray-900/50 p-2 rounded">
                                        <div className="font-mono">{item.laneId}</div>
                                        <div className="font-bold text-base">{item.avgScore}</div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-gray-500 text-center mb-4">No vehicles to analyze.</p>}
                    </div>
                    <div>
                        <h5 className="text-sm text-gray-400 mb-2 font-semibold">Top 5 High-Risk Vehicles</h5>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {(['all', 'car', 'truck', 'bus/minibus'] as const).map(option => (
                                <button
                                    key={option}
                                    onClick={() => setVehicleTypeFilter(option)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                                      ${vehicleTypeFilter === option
                                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                            : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/70 hover:border-gray-500'
                                        }`}
                                >
                                    {formatVehicleType(option)}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs space-y-1">
                            {top5HighRiskVehicles.length > 0 ? top5HighRiskVehicles.map(v => (
                                <div key={v.id} className="grid grid-cols-4 gap-2 p-1.5 rounded bg-gray-900/50 items-center">
                                    <span className="font-mono font-bold col-span-2">{v.plate}</span>
                                    <span className="text-center opacity-80">{formatVehicleType(v.type)}</span>
                                    <span className={`text-right font-bold pr-1 ${RISK_BAND_CONFIG[v.riskBand].style.replace('bg-', 'text-')}`}>{v.riskScore}</span>
                                </div>
                            )) : <p className="text-xs text-gray-500 text-center">No high-risk vehicles match the filter.</p>}
                        </div>
                    </div>
                </div>

                {/* Column 3: Customs View */}
                <div className="bg-black/20 p-4 rounded-lg border border-gray-800">
                    <h4 className="font-bold text-cyan-400 mb-3 text-center">Customs Coordination View</h4>
                    <div>
                        <h5 className="text-sm text-gray-400 mb-2 font-semibold">Selectivity Distribution</h5>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                            {Object.entries(selectivityDistribution).map(([channel, count]) => (
                                <div key={channel} className={`p-2 rounded border ${SELECTIVITY_CONFIG[channel as keyof typeof SELECTIVITY_CONFIG].style}`}>
                                    <div className="font-bold">{channel}</div>
                                    <div className="font-mono text-lg">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h5 className="text-sm text-gray-400 mb-2 font-semibold">Top 5 High-Risk Declarations</h5>
                        <div className="text-xs space-y-1">
                            {top5HighRiskDeclarations.length > 0 ? top5HighRiskDeclarations.map(d => (
                                <div key={d.id} className="grid grid-cols-5 gap-2 p-1.5 rounded bg-gray-900/50 items-center">
                                    <span className="font-mono font-bold col-span-2">{d.mrn}</span>
                                    <span className="opacity-80 truncate" title={d.traderName}>{d.traderName}</span>
                                    <span className="text-center font-mono">{d.hsCode}</span>
                                    <span className={`text-right font-bold pr-1 ${RISK_BAND_CONFIG[d.riskBand].style.replace('bg-', 'text-')}`}>{d.riskScore}</span>
                                </div>
                            )) : <p className="text-xs text-gray-500 text-center">No high-risk declarations.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-gray-500 text-xs mt-4 text-center">
                The Joint Risk Analysis Console provides a shared situational picture for Border Guard and Customs Coordination Centers.
            </p>
        </div>
    );
};
// --- Mock Data Generation for History Modal ---
interface LaneHistoryData {
  timestamp: Date;
  waitTime: number; // in minutes
  throughput: number; // vehicles per 10 mins
}

const generateLaneHistory = (lane: Lane): LaneHistoryData[] => {
  const history: LaneHistoryData[] = [];
  const now = Date.now();
  
  for (let i = 6; i > 0; i--) {
    const timestamp = new Date(now - i * 10 * 60 * 1000); // 6 intervals of 10 mins
    let waitTime = 0;
    let throughput = 0;

    switch(lane.status) {
      case 'high':
        waitTime = 30 + Math.floor(Math.random() * 20);
        throughput = 20 + Math.floor(Math.random() * 15);
        break;
      case 'medium':
        waitTime = 10 + Math.floor(Math.random() * 15);
        throughput = 10 + Math.floor(Math.random() * 10);
        break;
      case 'low':
        waitTime = 2 + Math.floor(Math.random() * 8);
        throughput = 5 + Math.floor(Math.random() * 5);
        break;
      case 'closed':
      default:
        waitTime = 0;
        throughput = 0;
        break;
    }

    waitTime = Math.max(0, waitTime + Math.floor(Math.random() * 6) - 3);
    throughput = Math.max(0, throughput + Math.floor(Math.random() * 4) - 2);

    history.push({ timestamp, waitTime, throughput });
  }
  return history;
}

// --- Custom Chart Tooltip for History Modal ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0d1117]/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 shadow-lg text-sm text-gray-200 font-sans">
        <p className="font-bold text-cyan-400 mb-2">{`Time: ${label}`}</p>
        {payload.map(pld => (
            <p key={pld.dataKey} style={{ color: pld.stroke || pld.fill }} className="font-semibold">
              {`${pld.name}: `}
              <span className="font-bold font-mono">{pld.value}</span>
           </p>
        ))}
      </div>
    );
  }

  return null;
};


// --- Lane History Modal Component ---
interface LaneHistoryModalProps {
  lane: Lane | null;
  onClose: () => void;
}

const LaneHistoryModal: React.FC<LaneHistoryModalProps> = ({ lane, onClose }) => {
  if (!lane) return null;

  const historyData = generateLaneHistory(lane);
  const laneTypeDisplay = lane.type.charAt(0).toUpperCase() + lane.type.slice(1);
  const vehicleTypeDisplay = formatVehicleType(lane.vehicleType);

  const chartData = historyData.map(d => ({
    ...d,
    time: d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  const handleExportCSV = () => {
    if (!lane || !historyData) return;

    const headers = ["Timestamp", "Wait Time (min)", "Throughput (vehicles)"];
    const rows = historyData.map(d => 
      [
        d.timestamp.toISOString(),
        d.waitTime,
        d.throughput
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const fileName = `lane-${lane.displayId}-${lane.type}-history-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lane-history-title"
    >
      <div 
        className="bg-[#0d1117] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 w-full max-w-3xl transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 id="lane-history-title" className="text-xl font-bold text-cyan-400">
            Lane {lane.displayId} ({laneTypeDisplay} / {vehicleTypeDisplay}) - Historical Data
          </h3>
          <div className="flex items-center gap-2">
            <button
                onClick={handleExportCSV}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-full p-2 bg-black/30 hover:bg-cyan-500/50"
                aria-label="Export data as CSV"
                title="Export as CSV"
            >
                <DownloadIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-full p-1"
              aria-label="Close historical data view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-300 mb-4">Last 60 Minutes Performance</h4>
          <div className="h-64 sm:h-80 bg-black/20 p-4 rounded-lg border border-gray-800">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  stroke="#facc15" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}m`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#67e8f9"
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(107, 235, 244, 0.1)' }}
                  content={<CustomTooltip />}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
                />
                <Bar yAxisId="right" dataKey="throughput" name="Throughput (vehicles)" fill="#22d3ee" fillOpacity={0.6} />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="waitTime" 
                  name="Wait Time (min)"
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#facc15' }}
                  activeDot={{ r: 6, stroke: '#fef08a', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main Component ---
interface CheckpointStatusWindowProps {
  data: BCPData;
  addEvent: AddEventFunction;
}

const CheckpointStatusWindow: React.FC<CheckpointStatusWindowProps> = ({ data, addEvent }) => {
  const [lanes, setLanes] = useState<Lane[]>(data.lanes);
  const [statusFilter, setStatusFilter] = useState<LaneStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LaneType | 'all'>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleType | 'all'>('all');
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [viewingHistoryForLane, setViewingHistoryForLane] = useState<Lane | null>(null);

  const addEventRef = useRef(addEvent);
  useEffect(() => {
    addEventRef.current = addEvent;
  }, [addEvent]);

  // Effect for simulating real-time updates
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      setLanes(currentLanes => {
        const newLanes = JSON.parse(JSON.stringify(currentLanes)); // Deep copy
        const updatedIds = new Set<string>();
        const availableStatuses = Object.keys(STATUS_CONFIG) as LaneStatus[];
        
        const updatesToMake = 1 + Math.floor(Math.random() * 2); // Update 1 or 2 lanes
        const availableLaneIndices = newLanes.map((_: any, index: number) => index);

        for (let i = 0; i < updatesToMake; i++) {
          if (availableLaneIndices.length === 0) break;
          
          const randomIndex = Math.floor(Math.random() * availableLaneIndices.length);
          const laneIndexToUpdate = availableLaneIndices.splice(randomIndex, 1)[0];
          
          const lane = newLanes[laneIndexToUpdate];
          const oldStatus = currentLanes[laneIndexToUpdate].status;
          const possibleNewStatuses = availableStatuses.filter(s => s !== lane.status);
          const newStatus = possibleNewStatuses[Math.floor(Math.random() * possibleNewStatuses.length)];
          
          if (oldStatus !== newStatus) {
            let eventType: EventType['type'] = 'info';
            if (newStatus === 'high') eventType = 'warning';
            
            addEventRef.current({
              type: eventType,
              message: `Lane ${lane.displayId} (${lane.type}/${formatVehicleType(lane.vehicleType)}) status changed to ${newStatus.toUpperCase()}.`
            });
          }

          lane.status = newStatus;
          updatedIds.add(lane.id);

          // Clear old detailed data
          delete lane.waitTime;
          delete lane.vehiclesAtBorder;
          delete lane.vehiclesAtCustoms;

          switch (newStatus) {
            case 'medium':
              lane.waitTime = `${Math.floor(Math.random() * 8) + 4} min`;
              lane.vehiclesAtBorder = Math.floor(Math.random() * 2) + 1; // 1-2
              lane.vehiclesAtCustoms = Math.floor(Math.random() * 2) + 1; // 1-2
              break;
            case 'high':
              lane.waitTime = `${Math.floor(Math.random() * 10) + 12} min`;
              lane.vehiclesAtBorder = Math.floor(Math.random() * 2) + 1; // 1-2
              lane.vehiclesAtCustoms = Math.floor(Math.random() * 3) + 2; // 2-4
              break;
            case 'closed':
              lane.waitTime = 'N/A';
              break;
            default: // 'low'
              // No extra data needed
              break;
          }
        }
        
        setRecentlyUpdated(updatedIds);
        return newLanes;
      });

      // Clear the "updated" visual effect after it has played
      setTimeout(() => {
        setRecentlyUpdated(new Set());
      }, 1500);

    }, 5000); // Run simulation every 5 seconds

    return () => clearInterval(simulationInterval); // Cleanup on unmount
  }, []);

  const openLanes = lanes.filter(lane => lane.status !== 'closed').length;
  
  const totalCapacity = lanes.reduce((acc, lane) => acc + STATUS_CONFIG[lane.status].capacity, 0);
  const maxCapacity = lanes.length * 100;
  const capacityPercentage = maxCapacity > 0 ? Math.round((totalCapacity / maxCapacity) * 100) : 0;

  const filteredLanes = lanes.filter(lane => 
    (statusFilter === 'all' || lane.status === statusFilter) &&
    (typeFilter === 'all' || lane.type === typeFilter) &&
    (vehicleTypeFilter === 'all' || lane.vehicleType === vehicleTypeFilter)
  );

  const entryLanes = filteredLanes.filter(l => l.type === 'entry');
  const exitLanes = filteredLanes.filter(l => l.type === 'exit');

  const handleClearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setVehicleTypeFilter('all');
  };

  return (
    <div className="bg-black border border-[#1c2029] rounded-2xl p-6 shadow-lg shadow-cyan-500/20 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-cyan-400 mb-3 tracking-wide">Checkpoint Status</h2>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-gray-300 text-base">
        <p>Lanes open: <b className="font-bold text-white text-lg">{openLanes}/{lanes.length}</b></p>
        <p>Total Capacity: <b className="font-bold text-white text-lg">{capacityPercentage}%</b></p>
        <p className="col-span-2">
          Cars: <b className="font-bold text-white">{data.summary.carsWait}</b> | Trucks: <b className="font-bold text-white">{data.summary.trucksWait}</b>
        </p>
      </div>

      <div className="my-2 flex-grow flex flex-col">
        <div className="mb-4 p-3 bg-black/20 rounded-lg border border-gray-800 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-400 w-12">Type:</span>
            {TYPE_FILTER_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setTypeFilter(option)}
                className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                  ${typeFilter === option
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_6px_rgba(107,235,244,0.4)]'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/70 hover:border-gray-500 hover:text-white'
                  }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-400 w-12">Vehicle:</span>
            {VEHICLE_TYPE_FILTER_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setVehicleTypeFilter(option)}
                className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                  ${vehicleTypeFilter === option
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_6px_rgba(107,235,244,0.4)]'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/70 hover:border-gray-500 hover:text-white'
                  }`}
              >
                {formatVehicleType(option)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-400 w-12">Status:</span>
            {STATUS_FILTER_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                  ${statusFilter === option
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_6px_rgba(107,235,244,0.4)]'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/70 hover:border-gray-500 hover:text-white'
                  }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <div className="text-right pt-2">
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/70 hover:border-gray-500 hover:text-white"
            >
              Clear All Filters
            </button>
          </div>
        </div>
        
        {/* Entry Lanes Section */}
        <div>
          <h3 className="text-base font-semibold text-gray-400 mb-2 text-center tracking-wider uppercase">Entry Lanes</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 min-h-[104px]">
            {entryLanes.length > 0 ? (
              entryLanes.map((lane) => (
                <LaneIndicator key={lane.id} lane={lane} isUpdated={recentlyUpdated.has(lane.id)} onViewHistory={() => setViewingHistoryForLane(lane)} />
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center text-gray-500 py-4">
                No entry lanes match selected filters.
              </div>
            )}
          </div>
        </div>

        {/* Exit Lanes Section */}
        <div className="mt-4">
          <h3 className="text-base font-semibold text-gray-400 mb-2 text-center tracking-wider uppercase">Exit Lanes</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 min-h-[104px]">
            {exitLanes.length > 0 ? (
              exitLanes.map((lane) => (
                <LaneIndicator key={lane.id} lane={lane} isUpdated={recentlyUpdated.has(lane.id)} onViewHistory={() => setViewingHistoryForLane(lane)} />
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center text-gray-500 py-4">
                No exit lanes match selected filters.
              </div>
            )}
          </div>
        </div>

        {/* Border Queue Section */}
        <div className="mt-6">
          <h3 className="text-base font-semibold text-gray-400 mb-3 text-center tracking-wider uppercase">Border Queue</h3>
          <div className="bg-black/20 rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                  <tr>
                    <th scope="col" className="px-4 py-3">Plate</th>
                    <th scope="col" className="px-4 py-3">Type</th>
                    <th scope="col" className="px-4 py-3">Country</th>
                    <th scope="col" className="px-4 py-3">Arrived</th>
                    <th scope="col" className="px-4 py-3 text-right">Risk Score</th>
                    <th scope="col" className="px-4 py-3 text-center">Risk Band</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicles.length > 0 ? (
                    data.vehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{vehicle.plate}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatVehicleType(vehicle.type)}</td>
                        <td className="px-4 py-3 font-mono">{vehicle.country}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(vehicle.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 font-mono text-right">{vehicle.riskScore}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${RISK_BAND_CONFIG[vehicle.riskBand].style}`}>
                            {RISK_BAND_CONFIG[vehicle.riskBand].text}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500">
                        No vehicles in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Joint Risk Analysis Console */}
        <JointRiskAnalysisConsole vehicles={data.vehicles} declarations={data.declarations} />

      </div>
      
      <div className="flex flex-wrap justify-around items-center gap-y-2 mt-auto pt-4 p-3 bg-black/20 rounded-lg border border-gray-800">
        <LegendItem colorClass={STATUS_CONFIG.low.legendColor} text="Low Traffic" />
        <LegendItem colorClass={STATUS_CONFIG.medium.legendColor} text="Medium Traffic" />
        <LegendItem colorClass={STATUS_CONFIG.high.legendColor} text="High Traffic" />
        <LegendItem colorClass={STATUS_CONFIG.closed.legendColor} text="Closed" />
      </div>

      <LaneHistoryModal lane={viewingHistoryForLane} onClose={() => setViewingHistoryForLane(null)} />
    </div>
  );
};

export default CheckpointStatusWindow;
