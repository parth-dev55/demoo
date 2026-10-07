import React from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { CloudRain, Wind, Droplets, ShoppingBag, MapPin, Star, Plus, Package, Truck, CheckCircle2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export function OrderTrackerVisualizer({ data }: { data: any }) {
  if (!data || !data.orderId || !data.status) return null;

  const steps = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
  const currentStepIndex = steps.indexOf(data.status);
  
  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-4 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Order #{data.orderId}</h3>
          <p className="text-xs text-zinc-400 mt-1">Expected Delivery: {data.estimatedDelivery || 'Unknown'}</p>
        </div>
        <Package className="w-8 h-8 text-emerald-500 opacity-80" />
      </div>
      
      <div className="relative flex justify-between">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -z-0 -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -z-0 -translate-y-1/2 transition-all duration-1000"
          style={{ width: `${Math.max(0, currentStepIndex) * (100 / (steps.length - 1))}%` }}
        />
        
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={index} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-zinc-950' 
                    : 'bg-zinc-900 border-zinc-700 text-transparent'
                } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
              >
                {isCompleted && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium absolute top-8 whitespace-nowrap ${isCompleted ? 'text-zinc-200' : 'text-zinc-500'}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-10 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
        <p className="text-xs text-zinc-300"><span className="font-semibold">Latest Update:</span> {data.update || 'Preparing your items for shipment.'}</p>
      </div>
    </div>
  );
}

export function ChartVisualizer({ data }: { data: any }) {
  if (!data || !data.data) return null;

  const { type = 'bar', title, data: chartData, dataKey = 'value', xAxisKey = 'name', color = '#10b981' } = data;

  const renderChart = () => {
    const props = {
      data: chartData,
      margin: { top: 10, right: 10, left: -20, bottom: 0 }
    };

    const commonProps = {
      stroke: color,
      fill: color,
      dataKey
    };

    switch (type) {
      case 'pie':
        const COLORS = [color, '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        return (
          <PieChart>
            <Pie data={chartData} dataKey={dataKey} nameKey={xAxisKey} cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill={color} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} stroke="#18181b" strokeWidth={2}>
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#f4f4f5' }} itemStyle={{color: '#f4f4f5'}} />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="x" type="number" name={xAxisKey} axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
            <YAxis dataKey="y" type="number" name={dataKey} axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
            <ZAxis dataKey="z" type="number" range={[50, 400]} name="size" />
            <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#f4f4f5' }} />
            <Scatter name="Data" data={chartData} fill={color} />
          </ScatterChart>
        );
      case 'line':
        return (
          <LineChart {...props}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#f4f4f5' }} />
            <Line type="monotone" {...commonProps} strokeWidth={2} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...props}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#f4f4f5' }} />
            <Area type="monotone" {...commonProps} fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        );
      case 'bar':
      default:
        const barRadius: [number, number, number, number] = [4, 4, 0, 0];
        return (
          <BarChart {...props}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
            <Tooltip cursor={{fill: '#18181b'}} contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#09090b', color: '#f4f4f5' }} />
            <Bar {...commonProps} radius={barRadius} />
          </BarChart>
        );
    }
  };

  if (type === 'heatmap' || type === 'calendar') {
    return (
      <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 my-4 shadow-lg overflow-x-auto">
        {title && <h3 className="text-sm font-semibold text-zinc-200 mb-4">{title}</h3>}
        <div className="flex flex-col gap-1 min-w-[300px]">
          {chartData && chartData.map((row: any, i: number) => (
            <div key={i} className="flex gap-1 items-center">
              <div className="w-12 text-xs text-zinc-500 font-medium truncate">{row.label || row.name || `Row ${i}`}</div>
              <div className="flex gap-1 flex-1">
                {row.values && row.values.map((val: any, j: number) => {
                  const intensity = Math.min(1, Math.max(0, val / (data.maxValue || 100)));
                  // Convert color (e.g. #10b981) to an opacity scale
                  return (
                    <div 
                      key={j} 
                      className="h-6 flex-1 rounded-sm relative group cursor-pointer"
                      style={{ backgroundColor: color, opacity: 0.1 + intensity * 0.9 }}
                    >
                      <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-zinc-800 text-zinc-200 text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 my-4 shadow-lg overflow-hidden">
      {title && <h3 className="text-sm font-semibold text-zinc-200 mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WeatherVisualizer({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-4 shadow-lg bg-gradient-to-br from-zinc-900 to-zinc-950">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center text-zinc-400 text-xs font-medium mb-1">
            <MapPin className="w-3 h-3 mr-1" /> {data.location || 'Unknown Location'}
          </div>
          <div className="text-3xl font-bold text-zinc-100">{data.temperature}</div>
          <div className="text-emerald-400 text-sm font-medium">{data.condition}</div>
        </div>
        <div className="text-4xl">{data.condition?.toLowerCase().includes('rain') ? '🌧️' : data.condition?.toLowerCase().includes('cloud') ? '⛅' : '☀️'}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center gap-3">
          <Droplets className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Humidity</div>
            <div className="text-sm font-semibold text-zinc-200">{data.humidity}</div>
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center gap-3">
          <Wind className="w-5 h-5 text-teal-400" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Wind</div>
            <div className="text-sm font-semibold text-zinc-200">{data.wind}</div>
          </div>
        </div>
      </div>

      {data.forecast && (
        <div className="text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
          <span className="font-semibold text-zinc-300">Forecast:</span> {data.forecast}
        </div>
      )}
    </div>
  );
}

export function FollowupVisualizer({ data, onSelect }: { data: any, onSelect?: (q: string) => void }) {
  if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {data.questions.map((q: string, i: number) => (
        <button
          key={i}
          onClick={() => onSelect && onSelect(q)}
          className="text-xs px-3 py-1.5 bg-[#18181b] border border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-400 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export function FormVisualizer({ data }: { data: any }) {
  const [submitted, setSubmitted] = React.useState(false);

  if (!data || !data.fields) return null;

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-4 shadow-lg">
      {data.title && <h3 className="text-sm font-semibold text-zinc-200 mb-4">{data.title}</h3>}
      
      {submitted ? (
        <div className="flex flex-col items-center justify-center py-6 text-emerald-400 gap-3">
          <CheckCircle2 className="w-8 h-8" />
          <p className="text-sm font-medium">Form submitted successfully</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
          {data.fields.map((field: any, i: number) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">{field.label}</label>
              <input 
                type={field.type || 'text'} 
                placeholder={field.placeholder || ''}
                required={field.required}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          ))}
          <button 
            type="submit"
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm py-2 rounded-lg transition-colors"
          >
            {data.submitLabel || 'Submit'}
          </button>
        </form>
      )}
    </div>
  );
}

export function MapVisualizer({ data }: { data: any }) {
  if (!data || !data.lat || !data.lng) return null;

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden my-4 shadow-lg relative">
      <div className="h-48 w-full bg-[#18181b] relative flex items-center justify-center overflow-hidden">
        {/* Mock Map Background - A simple grid to look like a map */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Map Marker */}
        <div className="absolute flex flex-col items-center">
          <div className="bg-emerald-500 text-zinc-950 p-2 rounded-full shadow-lg shadow-emerald-500/20 mb-1 z-10 animate-bounce">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="w-2 h-1 bg-zinc-900/50 rounded-full blur-sm"></div>
        </div>
      </div>
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex justify-between items-center backdrop-blur">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">{data.title || 'Location Map'}</h4>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{data.lat.toFixed(4)}, {data.lng.toFixed(4)}</p>
        </div>
        <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
          View Full Map
        </button>
      </div>
    </div>
  );
}

export function ProductsVisualizer({ data }: { data: any }) {
  const { addToCart } = useCart();
  if (!data || !data.items || !Array.isArray(data.items)) return null;

  return (
    <div className="w-full my-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-emerald-500" />
        Available Products
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.items.map((item: any, i: number) => {
          const numericPrice = typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : (item.price || 0);
          
          return (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col hover:border-emerald-500/50 transition-colors group cursor-pointer shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{item.supplier || 'Verified'}</span>
                {item.rating && (
                  <span className="flex items-center text-xs text-amber-400 font-medium" title={`${item.reviews || 0} reviews`}>
                    <Star className="w-3 h-3 mr-0.5 fill-amber-400" /> {item.rating} <span className="text-zinc-500 ml-1 text-[10px]">({item.reviews || Math.floor(Math.random() * 100 + 10)})</span>
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 mb-1 leading-snug">{item.name}</h4>
              {item.description && <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{item.description}</p>}
              
              <div className="text-[10px] text-zinc-500 mb-3 flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                {item.inventory ? `${item.inventory} in stock` : 'In stock'}
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between border-t border-zinc-800/50">
                <span className="text-lg font-bold text-zinc-100">{typeof item.price === 'string' ? item.price : `$${item.price}`}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart({
                      id: item.id || `prod-${i}-${Date.now()}`,
                      name: item.name,
                      price: numericPrice,
                      supplier: item.supplier || 'Verified Supplier'
                    });
                  }}
                  className="text-xs font-semibold bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-emerald-500 hover:text-white"
                >
                  <Plus className="w-3 h-3" /> Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
