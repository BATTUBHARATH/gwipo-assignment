import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import './App.css';

// Simulated database (in-memory for demo)
let customers = {};
if (!window.customersDB) window.customersDB = {};
const customersDB = window.customersDB;

function CreateCustomer() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!/^\d{10}$/.test(form.phone)) newErrors.phone = 'Phone must be 10 digits';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';
    if (!/^\d{6}$/.test(form.pinCode)) newErrors.pinCode = 'Pin code must be 6 digits';
    return newErrors;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length === 0) {
      try {
        // Create customer via API
        const customer = await api.createCustomer({
          id: Date.now().toString(),
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          pinCode: form.pinCode
        });
        customersDB[customer.id] = customer;
        customers[customer.id] = customer;
        navigate(`/customer/${customer.id}`);
      } catch (error) {
        // Handle duplicate ID or email error
        if (error.message.includes('Duplicate')) {
          const field = error.message.includes('email') ? 'email' : 'id';
          setErrors(prev => ({ ...prev, [field]: error.message }));
        } else {
          alert('Error creating customer: ' + error.message);
        }
      }
    } else {
      setErrors(validationErrors);
    }
  };

  return (
    <div className="App">
      <h2>Create New Customer</h2>
      <form onSubmit={handleSubmit} noValidate>
        <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} />
        {errors.firstName && <div className="error">{errors.firstName}</div>}

        <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} />
        {errors.lastName && <div className="error">{errors.lastName}</div>}

        <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} />
        {errors.phone && <div className="error">{errors.phone}</div>}

        <input name="address" placeholder="Address" value={form.address} onChange={handleChange} />
        {errors.address && <div className="error">{errors.address}</div>}

        <input name="city" placeholder="City" value={form.city} onChange={handleChange} />
        {errors.city && <div className="error">{errors.city}</div>}

        <input name="state" placeholder="State" value={form.state} onChange={handleChange} />
        {errors.state && <div className="error">{errors.state}</div>}

        <input name="pinCode" placeholder="Pin Code" value={form.pinCode} onChange={handleChange} />
        {errors.pinCode && <div className="error">{errors.pinCode}</div>}

        <button type="submit">Create Customer</button>
      </form>
      <div style={{marginTop: 20, textAlign: 'center'}}>
        <Link to="/customers">View Customer List</Link> |{' '}
        <Link to="/multi-address-search">Search Multiple Addresses</Link>
      </div>
    </div>
  );
}

function MultiAddressSearch() {
  const [search, setSearch] = useState('');
  // Find customers with more than one address
  const customersWithMultipleAddresses = Object.values(customersDB).filter(
    c => c.addresses && c.addresses.length > 1 &&
      (
        c.id.includes(search) ||
        c.firstName.toLowerCase().includes(search.toLowerCase()) ||
        c.lastName.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
  );

  return (
    <div className="App">
      <h2>Customers with Multiple Addresses</h2>
      <input
        style={{marginBottom: 16, width: '100%'}}
        placeholder="Search by ID, Name, or Phone"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <table className="customer-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Addresses</th>
          </tr>
        </thead>
        <tbody>
          {customersWithMultipleAddresses.length === 0 && (
            <tr>
              <td colSpan={4} style={{textAlign: 'center'}}>No customers found.</td>
            </tr>
          )}
          {customersWithMultipleAddresses.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.firstName} {c.lastName}</td>
              <td>{c.phone}</td>
              <td>
                <ul style={{paddingLeft: 18}}>
                  {c.addresses.map((a, idx) => (
                    <li key={idx}>
                      {a.address}, {a.city}, {a.state} - {a.pinCode}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop: 20, textAlign: 'center'}}>
        <Link to="/">Create New Customer</Link> |{' '}
        <Link to="/customers">Customer List</Link>
      </div>
    </div>
  );
}

function CustomerList() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [_, forceUpdate] = useState(0);

  // Paging and sorting state
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

  // Filter customers by search and address fields
  let customers = Object.values(customersDB).filter(c => {
    const matchesBasic =
      c.id.includes(search) ||
      c.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);

    const matchesAddress =
      (!city || c.addresses.some(a => a.city.toLowerCase().includes(city.toLowerCase()))) &&
      (!state || c.addresses.some(a => a.state.toLowerCase().includes(state.toLowerCase()))) &&
      (!pinCode || c.addresses.some(a => a.pinCode.includes(pinCode)));

    return matchesBasic && matchesAddress;
  });

  // Sorting
  customers.sort((a, b) => {
    let valA, valB;
    if (sortField === 'name') {
      valA = (a.firstName + ' ' + a.lastName).toLowerCase();
      valB = (b.firstName + ' ' + b.lastName).toLowerCase();
    } else if (sortField === 'phone') {
      valA = a.phone;
      valB = b.phone;
    } else {
      valA = a[sortField];
      valB = b[sortField];
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Paging
  const totalPages = Math.ceil(customers.length / pageSize);
  const pagedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (id) => {
    await api.deleteCustomer(id);
    delete customersDB[id];
    setConfirmId(null);
    forceUpdate(n => n + 1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCity('');
    setState('');
    setPinCode('');
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Reset to page 1 when filters change
  React.useEffect(() => { setPage(1); }, [search, city, state, pinCode]);

  return (
    <div className="App">
      <h2>Customer List</h2>
      <div style={{display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap'}}>
        <input
          style={{flex: 1}}
          placeholder="Search by ID, Name, or Phone"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          style={{flex: 1}}
          placeholder="City"
          value={city}
          onChange={e => setCity(e.target.value)}
        />
        <input
          style={{flex: 1}}
          placeholder="State"
          value={state}
          onChange={e => setState(e.target.value)}
        />
        <input
          style={{flex: 1}}
          placeholder="Pin Code"
          value={pinCode}
          onChange={e => setPinCode(e.target.value)}
        />
        <button type="button" onClick={handleResetFilters} style={{flex: 'none', minWidth: 90}}>
          Reset Filters
        </button>
      </div>
      <table className="customer-table">
        <thead>
          <tr>
            <th style={{cursor: 'pointer'}} onClick={() => handleSort('id')}>
              ID {sortField === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th style={{cursor: 'pointer'}} onClick={() => handleSort('name')}>
              Name {sortField === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th style={{cursor: 'pointer'}} onClick={() => handleSort('phone')}>
              Phone {sortField === 'phone' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th>Addresses</th>
            <th colSpan={2}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedCustomers.length === 0 && (
            <tr>
              <td colSpan={6} style={{textAlign: 'center'}}>No customers found.</td>
            </tr>
          )}
          {pagedCustomers.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.firstName} {c.lastName}</td>
              <td>{c.phone}</td>
              <td>
                <ul style={{paddingLeft: 18, margin: 0}}>
                  {c.addresses.map((a, idx) => (
                    <li key={idx}>
                      {a.address}, {a.city}, {a.state} - {a.pinCode}
                    </li>
                  ))}
                </ul>
              </td>
              <td>
                <Link to={`/customer/${c.id}`}>View</Link>
              </td>
              <td>
                <button
                  className="delete-btn"
                  onClick={() => setConfirmId(c.id)}
                >
                  Delete
                </button>
                {confirmId === c.id && (
                  <div className="confirm-dialog">
                    <div>Are you sure?</div>
                    <button onClick={() => handleDelete(c.id)}>Yes</button>
                    <button onClick={() => setConfirmId(null)}>No</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Paging controls */}
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, margin: '16px 0'}}>
        <button onClick={() => setPage(1)} disabled={page === 1}>First</button>
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>Prev</button>
        <span>Page {page} of {totalPages || 1}</span>
        <button onClick={() => setPage(page + 1)} disabled={page === totalPages || totalPages === 0}>Next</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0}>Last</button>
      </div>
      <div style={{marginTop: 20, textAlign: 'center'}}>
        <Link to="/">Create New Customer</Link> |{' '}
        <Link to="/multi-address-search">Search Multiple Addresses</Link>
      </div>
    </div>
  );
}

function CustomerProfile() {
  const { id } = useParams();
  const customer = customersDB[id];
  const [editMode, setEditMode] = useState(false);
  const [addresses, setAddresses] = useState(customer ? [...customer.addresses] : []);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!customer) {
    return (
      <div className="App">
        <h2>Customer Not Found</h2>
        <div style={{marginTop: 20, textAlign: 'center'}}>
          <Link to="/customers">Back to List</Link>
        </div>
      </div>
    );
  }

  const handleAddressChange = (idx, field, value) => {
    const updated = addresses.map((a, i) =>
      i === idx ? { ...a, [field]: value } : a
    );
    setAddresses(updated);
    setSuccess(false);
    setError('');
  };

  const handleAddAddress = () => {
    setAddresses([
      ...addresses,
      { address: '', city: '', state: '', pinCode: '' }
    ]);
    setSuccess(false);
    setError('');
  };

  const handleRemoveAddress = (idx) => {
    setAddresses(addresses.filter((_, i) => i !== idx));
    setSuccess(false);
    setError('');
  };

  const handleUpdateAddresses = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Simple validation
    for (let a of addresses) {
      if (!a.address.trim() || !a.city.trim() || !a.state.trim() || !/^\d{6}$/.test(a.pinCode)) {
        setError('All address fields are required and pin code must be 6 digits.');
        setLoading(false);
        return;
      }
    }
    try {
      const res = await api.updateCustomerAddresses(id, addresses);
      setSuccess(true);
      setEditMode(false);
    } catch (error) {
      setError('Update failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h2>Customer Profile</h2>
      <div className="profile-card">
        <div><strong>First Name:</strong> {customer.firstName}</div>
        <div><strong>Last Name:</strong> {customer.lastName}</div>
        <div><strong>Phone:</strong> {customer.phone}</div>
        <div><strong>Customer ID:</strong> {customer.id}</div>
        <div>
          <strong>Addresses:</strong>
          {editMode ? (
            <form onSubmit={handleUpdateAddresses} className="edit-form">
              {addresses.map((a, idx) => (
                <div key={idx} style={{marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8}}>
                  <label>Address:</label>
                  <input
                    value={a.address}
                    onChange={e => handleAddressChange(idx, 'address', e.target.value)}
                  />
                  <label>City:</label>
                  <input
                    value={a.city}
                    onChange={e => handleAddressChange(idx, 'city', e.target.value)}
                  />
                  <label>State:</label>
                  <input
                    value={a.state}
                    onChange={e => handleAddressChange(idx, 'state', e.target.value)}
                  />
                  <label>Pin Code:</label>
                  <input
                    value={a.pinCode}
                    onChange={e => handleAddressChange(idx, 'pinCode', e.target.value)}
                  />
                  {addresses.length > 1 && (
                    <button type="button" className="delete-btn" style={{marginTop: 6}} onClick={() => handleRemoveAddress(idx)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddAddress}>Add Address</button>
              <button type="submit" disabled={loading} style={{marginLeft: 8}}>Update Addresses</button>
              <button type="button" onClick={() => setEditMode(false)} style={{marginLeft: 8}}>Cancel</button>
              {error && <div className="error">{error}</div>}
            </form>
          ) : (
            customer.addresses.length === 1 ? (
              <div style={{color: "#3182ce", fontWeight: 500}}>
                Only One Address: {customer.addresses[0].address}, {customer.addresses[0].city}, {customer.addresses[0].state} - {customer.addresses[0].pinCode}
              </div>
            ) : (
              <ul style={{paddingLeft: 18}}>
                {customer.addresses.map((a, idx) => (
                  <li key={idx}>
                    {a.address}, {a.city}, {a.state} - {a.pinCode}
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
        {!editMode && (
          <button style={{marginTop: 12}} onClick={() => { setEditMode(true); setAddresses([...customer.addresses]); }}>Edit Addresses</button>
        )}
        {success && <div className="success">Addresses updated successfully!</div>}
      </div>
      <div style={{marginTop: 20, textAlign: 'center'}}>
        <Link to="/customers">Back to List</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreateCustomer />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customer/:id" element={<CustomerProfile />} />
        <Route path="/multi-address-search" element={<MultiAddressSearch />} />
      </Routes>
    </Router>
  );
}

export default App;