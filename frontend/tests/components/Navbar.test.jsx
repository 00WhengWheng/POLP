import { render, screen } from '@testing-library/react';
import Navbar from '../../src/components/Navbar';

describe('Navbar', () => {
  it('renders the logo', () => {
    render(<Navbar />);
    // Cerca il logo tramite alt text o testo visibile
    const logo = screen.getByAltText(/logo/i);
    expect(logo).toBeInTheDocument();
  });
});
