import { CurrentUser } from "./types";

type PrintSignatureProps = {
  currentUser: CurrentUser | null;
};

export default function PrintSignature({ currentUser }: PrintSignatureProps) {
  return (
    <div className="hidden print:block print-signature print:mt-3 print:pt-2 mt-8 pt-4 border-t border-black text-black">
      <div className="flex justify-between items-end text-[10px]">
        <div className="space-y-1">
          <p><strong>Responsável Técnico:</strong> {currentUser?.full_name ?? currentUser?.name ?? "Profissional Não Identificado"}</p>
          <p>
            <strong>Impresso por:</strong> {currentUser?.full_name ?? currentUser?.name ?? "Não Identificado"} 
            {currentUser?.username ? ` (${currentUser.username})` : ""} 
            {" — "}
            {currentUser?.role === "ADMIN" ? "Administrador" : currentUser?.role === "CLINICAL" ? "Enfermeiro" : currentUser?.role === "DEVELOPER" ? "Desenvolvedor" : "Profissional"}
          </p>
          <p><strong>Data de Impressão:</strong> {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="text-center w-64">
          <div className="border-b border-black mb-1 h-8"></div>
          <p className="font-bold">Assinatura e Carimbo do Profissional</p>
        </div>
      </div>
    </div>
  );
}
