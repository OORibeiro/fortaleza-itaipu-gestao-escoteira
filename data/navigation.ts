import { BarChart3, CircleDollarSign, LayoutDashboard, WalletCards } from "lucide-react";
import type { View } from "@/types/app";

export const navItems: { id: View; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "finance", label: "Financeiro", icon: CircleDollarSign },
  { id: "dues", label: "Mensalidades", icon: WalletCards },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
];

export const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "VISÃO GERAL",
    title: "Resumo financeiro",
    description: "Acompanhe rapidamente a situação financeira do grupo.",
  },
  finance: {
    eyebrow: "FINANCEIRO",
    title: "Gestão financeira",
    description: "Acompanhe as entradas, despesas e movimentações do caixa.",
  },
  dues: {
    eyebrow: "FINANCEIRO",
    title: "Mensalidades",
    description: "Controle os pagamentos, pendências e mensalidades em atraso.",
  },
  reports: {
    eyebrow: "ANÁLISE",
    title: "Relatórios financeiros",
    description: "Analise a evolução do caixa, receitas e principais despesas.",
  },
};
