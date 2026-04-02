export default function PrivacidadPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-xl font-bold mb-4">Política de Privacidad</h1>
      <p className="text-sm text-gray-600 mb-3">
        FútbolAficionado recopila únicamente los datos necesarios para el funcionamiento de la aplicación: nombre, email y equipo favorito.
      </p>
      <p className="text-sm text-gray-600 mb-3">
        No compartimos tus datos con terceros. Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento escribiendo a <strong>futbolaficionado.app@gmail.com</strong>.
      </p>
      <p className="text-sm text-gray-600">
        Si inicias sesión con Facebook, únicamente usamos tu nombre y email para crear tu perfil.
      </p>
    </div>
  );
}
