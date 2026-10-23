import { Link } from "react-router-dom";
import "./Header.css";

export default function Header() {
  return (
    <header>
      <Link to="/landing">
        <img src="/img/recargaYa.png" alt="Recarga Logo" />
      </Link>
      <nav>
        <ul>
          <li><Link to="/landing">Home</Link></li>
          <li><Link to="/recargas">Recargas</Link></li>
          <li><Link to="/tarjetaDeRegalo">Tarjeta de Regalo</Link></li>
        </ul>
      </nav>
    </header>
  );
}