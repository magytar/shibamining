'use client'
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Coins, Zap, TrendingUp, LogOut, Activity, Crown, Star, Menu, X } from "lucide-react";
import Image from "next/image";
import Img_logo from "./logo.png";

const PLANOS = {
	start: { nome: "Start", taxa: 0.89, icon: Star },
	"vip+": { nome: "VIP+", taxa: 8.67, icon: Crown },
	"vip++": { nome: "VIP++", taxa: 19.58, icon: Crown },
	"vip+++": { nome: "VIP+++", taxa: 28.41, icon: Crown }
};

const SAQUE_MINIMO = 350000;
const SAQUE_MAXIMO = 3500000;

export default function Dashboard() {
	const [email, setEmail] = useState("");
	const [saldo, setSaldo] = useState(0);
	const [plano, setPlano] = useState("start");
	const [loading, setLoading] = useState(true);
	const [mining, setMining] = useState(false);
	const [totalMined, setTotalMined] = useState(0);
	const [miningTime, setMiningTime] = useState(0);
	const [savingStatus, setSavingStatus] = useState("idle");
	const [showSaqueModal, setShowSaqueModal] = useState(false);
	const [valorSaque, setValorSaque] = useState("");
	const [enderecoCarteira, setEnderecoCarteira] = useState("");
	const [processingSaque, setProcessingSaque] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	
	const miningInterval = useRef(null);
	const saveInterval = useRef(null);
	const timeInterval = useRef(null);
	const saldoRef = useRef(saldo);
	const router = useRouter();

	const taxaMineracao = PLANOS[plano]?.taxa || 0.33;

	useEffect(() => {
		saldoRef.current = saldo;
	}, [saldo]);

	async function handleLogout() {
		if (mining) {
			await saveSaldoToDatabase();
		}
		await supabase.auth.signOut();
		document.cookie = "sb-access-token=; path=/; max-age=0";
		router.push("/");
	}

	async function saveSaldoToDatabase() {
		if (!email) return;
		
		setSavingStatus("saving");
		try {
			// Usa a ref para pegar o valor mais atualizado
			const saldoToSave = Number(saldoRef.current.toFixed(2));
			
			const { data: existing } = await supabase
				.from("saldos")
				.select("id")
				.eq("email", email)
				.single();

			let result;
			if (existing) {
				result = await supabase
					.from("saldos")
					.update({ saldo: saldoToSave })
					.eq("email", email);
			} else {
				result = await supabase
					.from("saldos")
					.insert([{ email, saldo: saldoToSave, plano: "start" }]);
			}
			
			if (result.error) {
				console.error("Erro ao salvar:", result.error);
				setSavingStatus("error");
			} else {
				console.log("Saldo salvo:", saldoToSave); // Debug
				setSavingStatus("saved");
				setTimeout(() => setSavingStatus("idle"), 2000);
			}
		} catch (err) {
			console.error("Erro ao salvar:", err);
			setSavingStatus("error");
			setTimeout(() => setSavingStatus("idle"), 3000);
		}
	}

	useEffect(() => {
		async function fetchUserAndSaldo() {
			setLoading(true);
			const { data: { user } } = await supabase.auth.getUser();
			if (user && user.email) {
				setEmail(user.email);
				const { data, error } = await supabase
					.from("saldos")
					.select("saldo, plano")
					.eq("email", user.email)
					.single();
				
				if (!error && data) {
					setSaldo(Number(data.saldo) || 0);
					setPlano(data.plano || "start");
				} else {
					await supabase
						.from("saldos")
						.insert([{ email: user.email, saldo: 0, plano: "start" }]);
					setSaldo(0);
					setPlano("start");
				}
			}
			setLoading(false);
		}
		fetchUserAndSaldo();
	}, []);

	useEffect(() => {
		if (mining && email) {
			miningInterval.current = setInterval(() => {
				setSaldo((prev) => {
					const newSaldo = Number(prev) + taxaMineracao;
					setTotalMined((total) => total + taxaMineracao);
					return newSaldo;
				});
			}, 1000);

			saveInterval.current = setInterval(async () => {
				await saveSaldoToDatabase();
			}, 20000);

			timeInterval.current = setInterval(() => {
				setMiningTime((prev) => prev + 1);
			}, 1000);
		} else {
			clearInterval(miningInterval.current);
			clearInterval(saveInterval.current);
			clearInterval(timeInterval.current);
		}
		
		return () => {
			clearInterval(miningInterval.current);
			clearInterval(saveInterval.current);
			clearInterval(timeInterval.current);
		};
	}, [mining, taxaMineracao, email]);

	useEffect(() => {
		return () => {
			if (email && saldo > 0) {
				supabase
					.from("saldos")
					.update({ saldo: Number(saldo.toFixed(2)) })
					.eq("email", email);
			}
		};
	}, [email, saldo]);

	async function handleMining() {
		if (mining) {
			await saveSaldoToDatabase();
			setMiningTime(0);
		}
		setMining((prev) => !prev);
	}

	function formatTime(seconds) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}

	function formatNumber(num) {
		return new Intl.NumberFormat('pt-BR').format(num);
	}

	async function handleSaque() {
		if (!valorSaque || !enderecoCarteira) {
			alert("Por favor, preencha o valor e o endereço da carteira");
			return;
		}

		const valor = parseFloat(valorSaque);
		if (isNaN(valor) || valor <= 0) {
			alert("Valor inválido");
			return;
		}

		if (valor < SAQUE_MINIMO) {
			alert(`Valor mínimo para saque: ${formatNumber(SAQUE_MINIMO)} SHIB`);
			return;
		}

		if (valor > SAQUE_MAXIMO) {
			alert(`Valor máximo para saque: ${formatNumber(SAQUE_MAXIMO)} SHIB`);
			return;
		}

		if (valor > saldo) {
			alert("Saldo insuficiente");
			return;
		}

		setProcessingSaque(true);
		try {
			const { error: saqueError } = await supabase
				.from("saques")
				.insert([{
					email: email,
					amount: valor,
					status: "pending",
					wallet_address: enderecoCarteira
				}]);

			if (saqueError) throw saqueError;

			const novoSaldo = saldo - valor;
			const { error: saldoError } = await supabase
				.from("saldos")
				.update({ saldo: novoSaldo })
				.eq("email", email);

			if (saldoError) throw saldoError;

			setSaldo(novoSaldo);
			setShowSaqueModal(false);
			setValorSaque("");
			setEnderecoCarteira("");
			alert("Solicitação de saque enviada com sucesso!");
		} catch (err) {
			console.error("Erro ao processar saque:", err);
			alert("Erro ao processar saque. Tente novamente.");
		} finally {
			setProcessingSaque(false);
		}
	}

	const PlanoAtual = PLANOS[plano] || PLANOS.start;
	const IconePlano = PlanoAtual.icon;

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			{/* Header */}
			<header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-900/80 border-b border-zinc-800">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
								<Image src={Img_logo} alt="Logo" width={40} height={40} />
							</div>
							<div>
								<h1 className="text-lg font-bold">SHIB Mining</h1>
								<p className="text-xs text-zinc-500">Dashboard</p>
							</div>
						</div>

						<div className="hidden md:flex items-center gap-3">
							<button
								onClick={handleLogout}
								className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
							>
								<LogOut className="w-4 h-4" />
								Sair
							</button>
						</div>

						<button
							onClick={() => setMenuOpen(!menuOpen)}
							className="md:hidden p-2 rounded-lg hover:bg-zinc-800"
						>
							{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
						</button>
					</div>
				</div>

				{menuOpen && (
					<div className="md:hidden border-t border-zinc-800 bg-zinc-900">
						<div className="px-4 py-3 space-y-2">
							<button
								onClick={handleLogout}
								className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
							>
								<LogOut className="w-4 h-4" />
								Sair
							</button>
						</div>
					</div>
				)}
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20">
						<div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
						<p className="text-zinc-400 mt-4 text-sm">Carregando...</p>
					</div>
				) : (
					<div className="space-y-6">
						{/* Plano Atual */}
						<div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-6 border border-zinc-700/50">
							<div className="flex items-center justify-between flex-wrap gap-4">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
										<IconePlano className="w-6 h-6 text-white" />
									</div>
									<div>
										<p className="text-xs text-zinc-500 uppercase tracking-wider">Plano Atual</p>
										<h2 className="text-2xl font-bold">{PlanoAtual.nome}</h2>
									</div>
								</div>
								<div className="text-right">
									<p className="text-xs text-zinc-500 uppercase tracking-wider">Taxa</p>
									<p className="text-3xl font-bold text-orange-500">{taxaMineracao}<span className="text-base text-zinc-400">/s</span></p>
								</div>
							</div>
						</div>

						{/* Stats Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-2">
										<Coins className="w-5 h-5 text-orange-500" />
										<span className="text-sm text-zinc-400">Saldo Total</span>
									</div>
								</div>
								<p className="text-3xl font-bold mb-1">{formatNumber(saldo.toFixed(3))}</p>
								<p className="text-xs text-zinc-500 mb-4">SHIB</p>
								<button
									onClick={() => setShowSaqueModal(true)}
									className="w-full py-2.5 px-4 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-sm font-medium transition-colors border border-orange-500/20"
								>
									Solicitar Saque
								</button>
							</div>

							<div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
								<div className="flex items-center gap-2 mb-4">
									<TrendingUp className="w-5 h-5 text-green-500" />
									<span className="text-sm text-zinc-400">Sessão Atual</span>
								</div>
								<p className="text-3xl font-bold mb-1">{formatNumber(totalMined.toFixed(2))}</p>
								<p className="text-xs text-zinc-500">SHIB minerado</p>
							</div>

							<div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 sm:col-span-2 lg:col-span-1">
								<div className="flex items-center gap-2 mb-4">
									<Activity className="w-5 h-5 text-blue-500" />
									<span className="text-sm text-zinc-400">Tempo Ativo</span>
								</div>
								<p className="text-3xl font-bold mb-1">{formatTime(miningTime)}</p>
								<p className="text-xs text-zinc-500">HH:MM:SS</p>
							</div>
						</div>

						{/* Mining Control */}
						<div className="bg-zinc-900 rounded-xl p-6 sm:p-8 border border-zinc-800">
							<button
								onClick={handleMining}
								className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
									mining 
										? 'bg-red-500 hover:bg-red-600 text-white' 
										: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
								}`}
							>
								<div className="flex items-center justify-center gap-3">
									<Zap className={`w-5 h-5 ${mining ? 'animate-pulse' : ''}`} />
									{mining ? 'Parar Mineração' : 'Iniciar Mineração'}
								</div>
							</button>
							
							{mining && (
								<div className="mt-4 flex items-center justify-center gap-2 text-sm">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
									<span className="text-green-500">Minerando ativamente</span>
								</div>
							)}

							{savingStatus !== "idle" && (
								<div className="mt-3 text-center text-xs">
									{savingStatus === "saving" && <span className="text-zinc-400">Salvando...</span>}
									{savingStatus === "saved" && <span className="text-green-500">Salvo com sucesso</span>}
									{savingStatus === "error" && <span className="text-red-500">Erro ao salvar</span>}
								</div>
							)}
						</div>

						{/* Planos */}
						<div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
							<h3 className="text-xl font-bold mb-6">Planos Disponíveis</h3>
							<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
								{Object.entries(PLANOS).map(([key, planoInfo]) => {
									const IconePlanoCard = planoInfo.icon;
									const isAtivo = key === plano;
									return (
										<div 
											key={key}
											className={`rounded-xl p-4 border transition-all ${
												isAtivo 
													? 'bg-orange-500/10 border-orange-500/50' 
													: 'bg-zinc-800/50 border-zinc-700/50'
											}`}
										>
											<div className="flex flex-col items-center text-center gap-2">
												<IconePlanoCard className={`w-6 h-6 ${isAtivo ? 'text-orange-500' : 'text-zinc-500'}`} />
												<h4 className="font-semibold">{planoInfo.nome}</h4>
												<div className="text-lg font-bold text-orange-500">
													{planoInfo.taxa}<span className="text-xs text-zinc-500">/s</span>
												</div>
												{isAtivo && (
													<span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">ATIVO</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
							<div className="mt-6 text-center">
								<p className="text-sm text-zinc-400 mb-3">Quer mudar de plano?</p>
								<a
									href="https://t.me/ShibaMining2025"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
								>
									<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.94 13.981l-2.97-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.954z"/>
									</svg>
									Contatar no Telegram
								</a>
							</div>
						</div>

						{/* User Info */}
						<div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
							<div className="grid sm:grid-cols-2 gap-4">
								<div>
									<p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Conta</p>
									<p className="text-sm font-medium break-all">{email}</p>
								</div>
								<div className="sm:text-right">
									<p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Ganho/Hora</p>
									<p className="text-sm font-medium text-orange-500">{formatNumber((taxaMineracao * 3600).toFixed(2))} SHIB</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>

			{/* Modal de Saque */}
			{showSaqueModal && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-800">
						<h2 className="text-2xl font-bold mb-6">Solicitar Saque</h2>
						
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-zinc-400 mb-2">
									Valor (SHIB)
								</label>
								<input
									type="number"
									value={valorSaque}
									onChange={(e) => setValorSaque(e.target.value)}
									placeholder="0"
									className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
								/>
								<p className="text-xs text-zinc-500 mt-1">
									Disponível: {formatNumber(saldo.toFixed(0))} SHIB
								</p>
								<p className="text-xs text-zinc-500 mt-1">
									Mínimo: {formatNumber(SAQUE_MINIMO)} SHIB | Máximo: {formatNumber(SAQUE_MAXIMO)} SHIB
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-zinc-400 mb-2">
									Endereço da Carteira
								</label>
								<input
									type="text"
									value={enderecoCarteira}
									onChange={(e) => setEnderecoCarteira(e.target.value)}
									placeholder="0x..."
									className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
								/>
							</div>

							<div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
								<p className="text-xs text-orange-400">
									⚠️ Verifique o endereço cuidadosamente. Saques não podem ser revertidos.
								</p>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									onClick={() => {
										setShowSaqueModal(false);
										setValorSaque("");
										setEnderecoCarteira("");
									}}
									className="flex-1 py-3 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors font-medium"
									disabled={processingSaque}
								>
									Cancelar
								</button>
								<button
									onClick={handleSaque}
									disabled={processingSaque}
									className="flex-1 py-3 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{processingSaque ? "Processando..." : "Confirmar"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}